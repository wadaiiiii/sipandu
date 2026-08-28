<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAnnouncement;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $classQuery = CourseClass::query();
        if (! in_array($user->role, [UserRole::AdminProdi, UserRole::Upm], true)) {
            $classQuery->whereHas('memberships', fn ($membership) => $membership
                ->where('user_id', $user->id)
                ->where('status', 'active'));
        }

        $classIds = $classQuery->pluck('id');
        $items = collect();

        if ($classIds->isNotEmpty() && Schema::hasTable('course_class_assignments')) {
            $assignments = CourseClassAssignment::query()
                ->with([
                    'meeting.courseClass.course:id,code,name',
                    'submissions' => fn ($query) => $query->where('user_id', $user->id),
                ])
                ->whereHas('meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
                ->where('status', 'published')
                ->whereNotNull('due_at')
                ->whereBetween('due_at', [now()->subDay(), now()->addDays(7)])
                ->orderBy('due_at')
                ->limit(8)
                ->get();

            foreach ($assignments as $assignment) {
                $courseClass = $assignment->meeting?->courseClass;
                if (! $courseClass) {
                    continue;
                }

                $submission = $assignment->submissions->first();
                $items->push([
                    'type' => 'assignment',
                    'title' => $assignment->title,
                    'description' => $user->role === UserRole::Student
                        ? ($submission?->submitted_at ? 'Sudah dikumpulkan' : 'Belum dikumpulkan')
                        : 'Tugas aktif dengan batas waktu terdekat',
                    'class_name' => $courseClass->course?->name.' — Kelas '.$courseClass->name,
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $assignment->due_at?->toIso8601String(),
                    'badge' => 'Deadline',
                    'priority' => $assignment->due_at?->isPast() ? 0 : 2,
                ]);
            }
        }

        if ($classIds->isNotEmpty() && Schema::hasTable('course_class_announcements')) {
            $announcements = CourseClassAnnouncement::query()
                ->with(['courseClass.course:id,code,name', 'author:id,name'])
                ->whereIn('course_class_id', $classIds)
                ->latest()
                ->limit(6)
                ->get();

            foreach ($announcements as $announcement) {
                $courseClass = $announcement->courseClass;
                if (! $courseClass) {
                    continue;
                }

                $items->push([
                    'type' => 'announcement',
                    'title' => 'Pengumuman baru',
                    'description' => str($announcement->body)->limit(110)->toString(),
                    'class_name' => $courseClass->course?->name.' — Kelas '.$courseClass->name,
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $announcement->created_at?->toIso8601String(),
                    'badge' => $announcement->author?->name ?? 'Pengajar',
                    'priority' => 1,
                ]);
            }
        }

        if ($user->role === UserRole::Student && Schema::hasTable('course_class_submissions')) {
            $graded = CourseClassSubmission::query()
                ->with('assignment.meeting.courseClass.course:id,code,name')
                ->where('user_id', $user->id)
                ->whereNotNull('graded_at')
                ->latest('graded_at')
                ->limit(5)
                ->get();

            foreach ($graded as $submission) {
                $assignment = $submission->assignment;
                $courseClass = $assignment?->meeting?->courseClass;
                if (! $assignment || ! $courseClass || ! $classIds->contains($courseClass->id)) {
                    continue;
                }

                $items->push([
                    'type' => 'grade',
                    'title' => $assignment->title.' sudah dinilai',
                    'description' => 'Nilai '.((float) $submission->score).'/'.((float) $assignment->max_score),
                    'class_name' => $courseClass->course?->name.' — Kelas '.$courseClass->name,
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $submission->graded_at?->toIso8601String(),
                    'badge' => 'Nilai',
                    'priority' => 1,
                ]);
            }
        }

        return response()->json([
            'today' => $this->sortTodayItems($items)->take(10)->values(),
            'summary' => [
                'classes' => $classIds->count(),
                'needs_attention' => $items->where('priority', 0)->count(),
                'upcoming' => $items->where('type', 'assignment')->where('priority', 2)->count(),
            ],
        ]);
    }

    private function sortTodayItems(Collection $items): Collection
    {
        return $items->sort(function (array $a, array $b): int {
            if ($a['priority'] !== $b['priority']) {
                return $a['priority'] <=> $b['priority'];
            }

            return strcmp((string) ($b['event_at'] ?? ''), (string) ($a['event_at'] ?? ''));
        });
    }
}
