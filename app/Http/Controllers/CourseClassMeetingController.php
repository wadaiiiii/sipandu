<?php

namespace App\Http\Controllers;

use App\Enums\RpsSourceType;
use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassMeeting;
use App\Models\User;
use App\Services\Classroom\CourseClassMeetingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class CourseClassMeetingController extends Controller
{
    public function page(Request $request, CourseClass $courseClass): View
    {
        $this->ensureCanView($request->user(), $courseClass);

        return view('classroom');
    }

    public function index(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeetingService $meetings,
    ): JsonResponse {
        $user = $request->user();
        $this->ensureCanView($user, $courseClass);
        $meetings->ensureDefaultSlots($courseClass);

        $courseClass->load([
            'course:id,code,name,credits',
            'academicTerm:id,academic_year,semester',
            'meetings',
        ]);

        return response()->json([
            'class' => [
                'id' => $courseClass->id,
                'name' => $courseClass->name,
                'status' => $courseClass->status,
                'course' => $courseClass->course,
                'academic_term' => $courseClass->academicTerm,
                'rps_source_type' => $courseClass->rps_source_type,
                'rps_source_label' => RpsSourceType::tryFrom($courseClass->rps_source_type)?->label() ?? $courseClass->rps_source_type,
            ],
            'can_edit' => $this->canEdit($user, $courseClass),
            'meetings' => $courseClass->meetings->map(fn (CourseClassMeeting $meeting): array => [
                'id' => $meeting->id,
                'meeting_number' => $meeting->meeting_number,
                'title' => $meeting->title,
                'topic' => $meeting->topic,
                'sub_cpmk_code' => $meeting->sub_cpmk_code,
                'learning_method' => $meeting->learning_method,
                'learning_activity' => $meeting->learning_activity,
                'material_summary' => $meeting->material_summary,
                'status' => $meeting->status,
                'starts_at' => $meeting->starts_at?->format('Y-m-d\TH:i'),
            ])->values(),
        ]);
    }

    public function update(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeeting $meeting,
    ): JsonResponse {
        abort_unless($meeting->course_class_id === $courseClass->id, 404);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'topic' => ['nullable', 'string', 'max:5000'],
            'sub_cpmk_code' => ['nullable', 'string', 'max:80'],
            'learning_method' => ['nullable', 'string', 'max:255'],
            'learning_activity' => ['nullable', 'string', 'max:10000'],
            'material_summary' => ['nullable', 'string', 'max:10000'],
            'status' => ['required', Rule::in(['planned', 'published', 'completed'])],
            'starts_at' => ['nullable', 'date'],
        ]);

        $meeting->update($validated);

        return response()->json(['ok' => true]);
    }

    private function ensureCanView(User $user, CourseClass $courseClass): void
    {
        abort_unless($this->canView($user, $courseClass), 403);
    }

    private function canView(User $user, CourseClass $courseClass): bool
    {
        if (in_array($user->role, [UserRole::AdminProdi, UserRole::Upm], true)) {
            return true;
        }

        return $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }

    private function canEdit(User $user, CourseClass $courseClass): bool
    {
        if ($user->role === UserRole::AdminProdi) {
            return true;
        }

        if ($user->role !== UserRole::Lecturer) {
            return false;
        }

        return $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('membership_role', 'lecturer')
            ->where('status', 'active')
            ->exists();
    }
}
