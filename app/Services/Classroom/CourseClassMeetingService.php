<?php

namespace App\Services\Classroom;

use App\Models\CourseClass;
use Illuminate\Support\Facades\DB;

class CourseClassMeetingService
{
    public function ensureDefaultSlots(CourseClass $courseClass, int $total = 16): void
    {
        $existing = $courseClass->meetings()
            ->pluck('meeting_number')
            ->map(fn ($number): int => (int) $number)
            ->all();

        $missing = array_values(array_diff(range(1, $total), $existing));

        if ($missing === []) {
            return;
        }

        $now = now();
        $rows = array_map(
            fn (int $number): array => [
                'course_class_id' => $courseClass->id,
                'meeting_number' => $number,
                'title' => "Pertemuan {$number}",
                'status' => 'planned',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            $missing,
        );

        DB::table('course_class_meetings')->insertOrIgnore($rows);
    }
}
