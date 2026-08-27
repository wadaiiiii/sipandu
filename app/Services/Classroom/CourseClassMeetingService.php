<?php

namespace App\Services\Classroom;

use App\Models\CourseClass;

class CourseClassMeetingService
{
    public function ensureDefaultSlots(CourseClass $courseClass, int $total = 16): void
    {
        for ($number = 1; $number <= $total; $number++) {
            $courseClass->meetings()->firstOrCreate(
                ['meeting_number' => $number],
                [
                    'title' => "Pertemuan {$number}",
                    'status' => 'planned',
                ],
            );
        }
    }
}
