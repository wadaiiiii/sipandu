<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAnnouncement;
use App\Models\CourseClassComment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\View\View;

class ClassJournalController extends Controller
{
    public function __invoke(Request $request, CourseClass $courseClass): View
    {
        $this->ensureCanView($request->user(), $courseClass);

        $courseClass->load([
            'course:id,code,name,credits',
            'academicTerm:id,academic_year,semester',
            'memberships.user:id,name,email,identity_number,role',
            'meetings.materials',
            'meetings.assignments.submissions',
        ]);

        $announcements = Schema::hasTable('course_class_announcements')
            ? CourseClassAnnouncement::query()
                ->with('author:id,name')
                ->where('course_class_id', $courseClass->id)
                ->latest()
                ->get()
            : collect();

        $comments = Schema::hasTable('course_class_comments')
            ? CourseClassComment::query()
                ->with('author:id,name')
                ->where('course_class_id', $courseClass->id)
                ->latest()
                ->get()
            : collect();

        $students = $courseClass->memberships
            ->where('membership_role', 'student')
            ->where('status', 'active');

        $lecturers = $courseClass->memberships
            ->where('membership_role', 'lecturer')
            ->where('status', 'active');

        $materialsCount = $courseClass->meetings->sum(fn ($meeting) => $meeting->materials->count());
        $assignmentsCount = $courseClass->meetings->sum(fn ($meeting) => $meeting->assignments->count());
        $submissionsCount = $courseClass->meetings->sum(
            fn ($meeting) => $meeting->assignments->sum(fn ($assignment) => $assignment->submissions->whereNotNull('submitted_at')->count()),
        );
        $gradedCount = $courseClass->meetings->sum(
            fn ($meeting) => $meeting->assignments->sum(fn ($assignment) => $assignment->submissions->whereNotNull('score')->count()),
        );

        return view('class-journal', [
            'courseClass' => $courseClass,
            'announcements' => $announcements,
            'comments' => $comments,
            'students' => $students,
            'lecturers' => $lecturers,
            'summary' => [
                'completed_meetings' => $courseClass->meetings->where('status', 'completed')->count(),
                'materials' => $materialsCount,
                'assignments' => $assignmentsCount,
                'submissions' => $submissionsCount,
                'graded' => $gradedCount,
                'announcements' => $announcements->count(),
                'comments' => $comments->count(),
            ],
        ]);
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
}
