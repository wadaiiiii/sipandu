<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassMeeting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CourseClassMaterialResourceController extends Controller
{
    public function index(Request $request, CourseClass $courseClass): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->canView($user, $courseClass), 403);

        $materials = $courseClass->meetings()
            ->with(['materials' => function ($query) use ($user): void {
                if ($user->role === UserRole::Student) {
                    $query->where('is_published', true);
                }
            }])
            ->get(['id', 'course_class_id', 'meeting_number'])
            ->flatMap(fn (CourseClassMeeting $meeting) => $meeting->materials->map(fn ($material): array => [
                'id' => $material->id,
                'meeting_id' => $meeting->id,
                'meeting_number' => $meeting->meeting_number,
                'title' => $material->title,
                'resource_url' => $material->resource_url,
                'attachment_url' => $material->attachment_url,
                'attachment_name' => $material->attachment_name,
            ]))
            ->values();

        return response()->json(['resources' => $materials]);
    }

    public function store(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeeting $meeting,
    ): JsonResponse {
        abort_unless($meeting->course_class_id === $courseClass->id, 404);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'resource_type' => ['required', Rule::in(['link', 'document', 'video', 'reading', 'other'])],
            'description' => ['nullable', 'string', 'max:5000'],
            'resource_url' => ['nullable', 'url', 'max:2000'],
            'attachment_url' => ['nullable', 'url', 'max:2000'],
            'attachment_name' => ['nullable', 'string', 'max:255'],
            'is_published' => ['required', 'boolean'],
        ]);

        $material = $meeting->materials()->create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['material' => $material], 201);
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

        return $user->role === UserRole::Lecturer
            && $courseClass->memberships()
                ->where('user_id', $user->id)
                ->where('membership_role', 'lecturer')
                ->where('status', 'active')
                ->exists();
    }
}
