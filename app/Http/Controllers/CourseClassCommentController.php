<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassComment;
use App\Models\CourseClassMaterial;
use App\Models\CourseClassMeeting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CourseClassCommentController extends Controller
{
    public function index(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanView($request->user(), $courseClass);

        $comments = CourseClassComment::query()
            ->with([
                'author:id,name,email,role',
                'meeting:id,course_class_id,meeting_number,title',
                'material:id,course_class_meeting_id,title',
                'material.meeting:id,course_class_id',
                'assignment:id,course_class_meeting_id,title',
                'assignment.meeting:id,course_class_id',
            ])
            ->where('course_class_id', $courseClass->id)
            ->oldest()
            ->get()
            ->map(fn (CourseClassComment $comment): array => $this->serialize($comment, $request->user(), $courseClass));

        return response()->json(['comments' => $comments]);
    }

    public function store(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanComment($request->user(), $courseClass);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'target_type' => ['required', Rule::in(['class', 'meeting', 'material', 'assignment'])],
            'target_id' => ['nullable', 'integer'],
            'parent_id' => ['nullable', 'integer'],
        ]);

        $targetType = $validated['target_type'];
        $targetId = $validated['target_id'] ?? null;

        if ($targetType !== 'class' && ! $targetId) {
            return response()->json(['message' => 'Pilih target diskusi terlebih dahulu.'], 422);
        }

        $meetingId = null;
        $materialId = null;
        $assignmentId = null;

        if ($targetType === 'meeting') {
            $meeting = CourseClassMeeting::query()->findOrFail($targetId);
            abort_unless($meeting->course_class_id === $courseClass->id, 404);
            $meetingId = $meeting->id;
        }

        if ($targetType === 'material') {
            $material = CourseClassMaterial::query()->with('meeting:id,course_class_id')->findOrFail($targetId);
            abort_unless($material->meeting?->course_class_id === $courseClass->id, 404);
            $materialId = $material->id;
        }

        if ($targetType === 'assignment') {
            $assignment = CourseClassAssignment::query()->with('meeting:id,course_class_id')->findOrFail($targetId);
            abort_unless($assignment->meeting?->course_class_id === $courseClass->id, 404);
            $assignmentId = $assignment->id;
        }

        $parentId = $validated['parent_id'] ?? null;
        if ($parentId) {
            $parent = CourseClassComment::query()->findOrFail($parentId);
            abort_unless($parent->course_class_id === $courseClass->id, 404);
        }

        $comment = CourseClassComment::query()->create([
            'course_class_id' => $courseClass->id,
            'course_class_meeting_id' => $meetingId,
            'course_class_material_id' => $materialId,
            'course_class_assignment_id' => $assignmentId,
            'parent_id' => $parentId,
            'body' => trim($validated['body']),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'ok' => true,
            'comment_id' => $comment->id,
        ], 201);
    }

    public function destroy(Request $request, CourseClass $courseClass, CourseClassComment $comment): JsonResponse
    {
        abort_unless($comment->course_class_id === $courseClass->id, 404);

        $user = $request->user();
        abort_unless(
            $comment->created_by === $user->id || $this->canModerate($user, $courseClass),
            403,
        );

        $comment->delete();

        return response()->json(['ok' => true]);
    }

    private function serialize(CourseClassComment $comment, User $viewer, CourseClass $courseClass): array
    {
        $targetType = 'class';
        $targetId = null;
        $targetLabel = 'Diskusi kelas';

        if ($comment->meeting) {
            $targetType = 'meeting';
            $targetId = $comment->meeting->id;
            $targetLabel = 'Pertemuan '.$comment->meeting->meeting_number;
            if ($comment->meeting->title) {
                $targetLabel .= ' · '.$comment->meeting->title;
            }
        } elseif ($comment->material) {
            $targetType = 'material';
            $targetId = $comment->material->id;
            $targetLabel = 'Materi · '.$comment->material->title;
        } elseif ($comment->assignment) {
            $targetType = 'assignment';
            $targetId = $comment->assignment->id;
            $targetLabel = 'Tugas · '.$comment->assignment->title;
        }

        return [
            'id' => $comment->id,
            'body' => $comment->body,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_label' => $targetLabel,
            'parent_id' => $comment->parent_id,
            'created_at' => $comment->created_at?->toIso8601String(),
            'can_delete' => $comment->created_by === $viewer->id || $this->canModerate($viewer, $courseClass),
            'author' => $comment->author ? [
                'id' => $comment->author->id,
                'name' => $comment->author->name,
                'email' => $comment->author->email,
                'role' => $comment->author->role->value,
            ] : null,
        ];
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

    private function ensureCanComment(User $user, CourseClass $courseClass): void
    {
        if ($user->role === UserRole::AdminProdi) {
            return;
        }

        abort_unless(
            in_array($user->role, [UserRole::Lecturer, UserRole::Student], true)
            && $courseClass->memberships()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists(),
            403,
        );
    }

    private function canModerate(User $user, CourseClass $courseClass): bool
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
