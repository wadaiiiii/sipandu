<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAnnouncement;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseClassAnnouncementController extends Controller
{
    public function index(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanView($request->user(), $courseClass);

        $announcements = CourseClassAnnouncement::query()
            ->with('author:id,name,email')
            ->where('course_class_id', $courseClass->id)
            ->orderByDesc('is_pinned')
            ->latest()
            ->get()
            ->map(fn (CourseClassAnnouncement $announcement): array => [
                'id' => $announcement->id,
                'body' => $announcement->body,
                'is_pinned' => $announcement->is_pinned,
                'created_at' => $announcement->created_at?->toIso8601String(),
                'author' => $announcement->author ? [
                    'id' => $announcement->author->id,
                    'name' => $announcement->author->name,
                    'email' => $announcement->author->email,
                ] : null,
            ]);

        return response()->json(['announcements' => $announcements]);
    }

    public function store(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanEdit($request->user(), $courseClass);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'is_pinned' => ['sometimes', 'boolean'],
        ]);

        $announcement = CourseClassAnnouncement::query()->create([
            'course_class_id' => $courseClass->id,
            'body' => trim($validated['body']),
            'is_pinned' => (bool) ($validated['is_pinned'] ?? false),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'ok' => true,
            'announcement_id' => $announcement->id,
        ], 201);
    }

    public function destroy(
        Request $request,
        CourseClass $courseClass,
        CourseClassAnnouncement $announcement,
    ): JsonResponse {
        abort_unless($announcement->course_class_id === $courseClass->id, 404);
        $this->ensureCanEdit($request->user(), $courseClass);

        $announcement->delete();

        return response()->json(['ok' => true]);
    }

    private function ensureCanView(User $user, CourseClass $courseClass): void
    {
        if (in_array($user->role, [UserRole::AdminProdi, UserRole::Upm], true)) {
            return;
        }

        abort_unless(
            $courseClass->memberships()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists(),
            403,
        );
    }

    private function ensureCanEdit(User $user, CourseClass $courseClass): void
    {
        if ($user->role === UserRole::AdminProdi) {
            return;
        }

        abort_unless(
            $user->role === UserRole::Lecturer
            && $courseClass->memberships()
                ->where('user_id', $user->id)
                ->where('membership_role', 'lecturer')
                ->where('status', 'active')
                ->exists(),
            403,
        );
    }
}
