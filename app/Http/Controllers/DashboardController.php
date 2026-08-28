<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAnnouncement;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassMaterial;
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
        $today = collect();
        $notifications = collect();

        if ($classIds->isNotEmpty() && Schema::hasTable('course_class_assignments')) {
            $recentAssignments = CourseClassAssignment::query()
                ->with([
                    'meeting.courseClass.course:id,code,name',
                    'submissions' => fn ($query) => $query->where('user_id', $user->id),
                ])
                ->whereHas('meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
                ->where('status', 'published')
                ->where('created_at', '>=', now()->subDays(7))
                ->latest()
                ->limit(12)
                ->get();

            foreach ($recentAssignments as $assignment) {
                $courseClass = $assignment->meeting?->courseClass;
                if (! $courseClass) {
                    continue;
                }

                $notifications->push([
                    'id' => "assignment-{$assignment->id}",
                    'type' => 'assignment',
                    'title' => 'Tugas baru: '.$assignment->title,
                    'description' => $assignment->due_at
                        ? 'Batas waktu '. $assignment->due_at->translatedFormat('d M Y H:i')
                        : 'Tugas baru telah dipublikasikan.',
                    'class_name' => $this->className($courseClass),
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $assignment->created_at?->toIso8601String(),
                    'badge' => 'Tugas',
                    'priority' => 1,
                ]);
            }

            $dueAssignments = CourseClassAssignment::query()
                ->with([
                    'meeting.courseClass.course:id,code,name',
                    'submissions' => fn ($query) => $query->where('user_id', $user->id),
                ])
                ->whereHas('meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
                ->where('status', 'published')
                ->whereNotNull('due_at')
                ->whereBetween('due_at', [now()->subDays(2), now()->addDays(7)])
                ->orderBy('due_at')
                ->limit(10)
                ->get();

            foreach ($dueAssignments as $assignment) {
                $courseClass = $assignment->meeting?->courseClass;
                if (! $courseClass) {
                    continue;
                }

                $submission = $assignment->submissions->first();
                if ($user->role === UserRole::Student && $submission?->submitted_at) {
                    continue;
                }

                $isOverdue = $assignment->due_at?->isPast() ?? false;
                $isUrgent = $assignment->due_at?->lte(now()->addDay()) ?? false;

                $today->push([
                    'id' => "deadline-{$assignment->id}",
                    'type' => 'assignment',
                    'title' => $assignment->title,
                    'description' => $user->role === UserRole::Student
                        ? ($isOverdue ? 'Terlambat dan belum dikumpulkan' : 'Belum dikumpulkan')
                        : 'Tugas aktif dengan batas waktu terdekat',
                    'class_name' => $this->className($courseClass),
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $assignment->due_at?->toIso8601String(),
                    'badge' => $isOverdue ? 'Terlambat' : ($isUrgent ? 'Segera' : 'Deadline'),
                    'priority' => $isOverdue || $isUrgent ? 0 : 2,
                ]);
            }
        }

        if ($classIds->isNotEmpty() && Schema::hasTable('course_class_materials')) {
            $materials = CourseClassMaterial::query()
                ->with(['meeting.courseClass.course:id,code,name', 'creator:id,name'])
                ->whereHas('meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
                ->where('is_published', true)
                ->where('created_at', '>=', now()->subDays(7))
                ->latest()
                ->limit(10)
                ->get();

            foreach ($materials as $material) {
                $courseClass = $material->meeting?->courseClass;
                if (! $courseClass) {
                    continue;
                }

                $item = [
                    'id' => "material-{$material->id}",
                    'type' => 'material',
                    'title' => 'Materi baru: '.$material->title,
                    'description' => filled($material->description)
                        ? str($material->description)->limit(100)->toString()
                        : 'Materi baru tersedia untuk dipelajari.',
                    'class_name' => $this->className($courseClass),
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $material->created_at?->toIso8601String(),
                    'badge' => 'Materi',
                    'priority' => 1,
                ];

                $notifications->push($item);
                if ($material->created_at?->gte(now()->subDays(2))) {
                    $today->push($item);
                }
            }
        }

        if ($classIds->isNotEmpty() && Schema::hasTable('course_class_announcements')) {
            $announcements = CourseClassAnnouncement::query()
                ->with(['courseClass.course:id,code,name', 'author:id,name'])
                ->whereIn('course_class_id', $classIds)
                ->where('created_at', '>=', now()->subDays(7))
                ->latest()
                ->limit(10)
                ->get();

            foreach ($announcements as $announcement) {
                $courseClass = $announcement->courseClass;
                if (! $courseClass) {
                    continue;
                }

                $item = [
                    'id' => "announcement-{$announcement->id}",
                    'type' => 'announcement',
                    'title' => 'Pengumuman baru',
                    'description' => str($announcement->body)->limit(110)->toString(),
                    'class_name' => $this->className($courseClass),
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $announcement->created_at?->toIso8601String(),
                    'badge' => $announcement->author?->name ?? 'Pengajar',
                    'priority' => 1,
                ];

                $notifications->push($item);
                if ($announcement->created_at?->gte(now()->subDays(3))) {
                    $today->push($item);
                }
            }
        }

        if ($user->role === UserRole::Student && Schema::hasTable('course_class_submissions')) {
            $graded = CourseClassSubmission::query()
                ->with('assignment.meeting.courseClass.course:id,code,name')
                ->where('user_id', $user->id)
                ->whereNotNull('graded_at')
                ->where('graded_at', '>=', now()->subDays(7))
                ->latest('graded_at')
                ->limit(8)
                ->get();

            foreach ($graded as $submission) {
                $assignment = $submission->assignment;
                $courseClass = $assignment?->meeting?->courseClass;
                if (! $assignment || ! $courseClass || ! $classIds->contains($courseClass->id)) {
                    continue;
                }

                $item = [
                    'id' => "grade-{$submission->id}-".optional($submission->graded_at)->timestamp,
                    'type' => 'grade',
                    'title' => $assignment->title.' sudah dinilai',
                    'description' => 'Nilai '.((float) $submission->score).'/'.((float) $assignment->max_score)
                        .(filled($submission->feedback) ? ' · Ada feedback dari pengajar' : ''),
                    'class_name' => $this->className($courseClass),
                    'class_url' => "/kelas/{$courseClass->id}",
                    'event_at' => $submission->graded_at?->toIso8601String(),
                    'badge' => 'Nilai',
                    'priority' => 1,
                ];

                $notifications->push($item);
                if ($submission->graded_at?->gte(now()->subDays(3))) {
                    $today->push($item);
                }
            }
        }

        $notifications = $notifications
            ->filter(fn (array $item): bool => filled($item['event_at'] ?? null))
            ->unique('id')
            ->sortByDesc('event_at')
            ->take(20)
            ->values();

        return response()->json([
            'today' => $this->sortTodayItems($today)->unique('id')->take(10)->values(),
            'notifications' => $notifications,
            'summary' => [
                'classes' => $classIds->count(),
                'needs_attention' => $today->where('priority', 0)->count(),
                'upcoming' => $today->where('type', 'assignment')->where('priority', 2)->count(),
            ],
        ]);
    }

    private function className(CourseClass $courseClass): string
    {
        return ($courseClass->course?->name ?? 'Kelas').' — Kelas '.$courseClass->name;
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
