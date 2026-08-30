<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassMaterialProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentClassProgressController extends Controller
{
    public function __invoke(Request $request, CourseClass $courseClass): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === UserRole::Student, 403);
        abort_unless($courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('membership_role', 'student')
            ->where('status', 'active')
            ->exists(), 403);

        $courseClass->load([
            'course:id,code,name',
            'meetings:id,course_class_id,status',
            'meetings.materials:id,course_class_meeting_id,is_published',
            'meetings.assignments:id,course_class_meeting_id,status',
            'meetings.assignments.submissions' => fn ($query) => $query
                ->select(['id', 'course_class_assignment_id', 'user_id', 'submitted_at'])
                ->where('user_id', $user->id),
        ]);

        $meetings = $courseClass->meetings;
        $materials = $meetings->flatMap->materials->where('is_published', true);
        $assignments = $meetings->flatMap->assignments
            ->filter(fn ($assignment): bool => in_array($assignment->status, ['published', 'closed'], true));

        $learnedIds = $materials->isEmpty()
            ? collect()
            : CourseClassMaterialProgress::query()
                ->where('user_id', $user->id)
                ->whereIn('course_class_material_id', $materials->pluck('id'))
                ->whereNotNull('learned_at')
                ->pluck('course_class_material_id');

        $completedMeetings = $meetings->where('status', 'completed')->count();
        $learnedMaterials = $materials->whereIn('id', $learnedIds)->count();
        $submittedAssignments = $assignments->filter(fn ($assignment): bool => $assignment->submissions->whereNotNull('submitted_at')->isNotEmpty())->count();

        $total = $meetings->count() + $materials->count() + $assignments->count();
        $completed = $completedMeetings + $learnedMaterials + $submittedAssignments;
        $overall = $total > 0 ? (int) round(($completed / $total) * 100) : 0;

        $item = [
            'class_id' => $courseClass->id,
            'class_name' => ($courseClass->course?->name ?? 'Kelas').' — Kelas '.$courseClass->name,
            'class_url' => "/kelas/{$courseClass->id}",
            'overall_percent' => $overall,
            'completed_meetings' => $completedMeetings,
            'total_meetings' => $meetings->count(),
            'learned_materials' => $learnedMaterials,
            'materials_available' => $materials->count(),
            'submitted_assignments' => $submittedAssignments,
            'total_assignments' => $assignments->count(),
        ];

        return response()->json([
            'progress' => [
                'overall_percent' => $overall,
                'classes' => [$item],
            ],
        ]);
    }
}
