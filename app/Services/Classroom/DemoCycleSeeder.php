<?php

namespace App\Services\Classroom;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAnnouncement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DemoCycleSeeder
{
    public const STUDENT_EMAIL = 'mahasiswa.uji@sipandu.test';

    public function __construct(
        private readonly CourseClassDemoSeeder $classDemoSeeder,
    ) {}

    public function seedIfNeeded(User $actor): ?array
    {
        if ($actor->role !== UserRole::AdminProdi) {
            return null;
        }

        if (User::query()->where('email', self::STUDENT_EMAIL)->exists()) {
            return null;
        }

        $classes = CourseClass::query()
            ->with('course:id,code,name')
            ->latest()
            ->take(2)
            ->get();

        if ($classes->count() < 2) {
            return null;
        }

        $seeded = [];

        foreach ($classes as $courseClass) {
            $created = $this->classDemoSeeder->seed($courseClass, $actor);

            CourseClassAnnouncement::query()->firstOrCreate(
                [
                    'course_class_id' => $courseClass->id,
                    'body' => $this->announcementBody($courseClass),
                ],
                [
                    'is_pinned' => true,
                    'created_by' => $actor->id,
                ],
            );

            $seeded[] = [
                'class_id' => $courseClass->id,
                'class_name' => ($courseClass->course?->name ?? 'Kelas').' — '.$this->classLabel($courseClass->name),
                'created' => $created,
            ];
        }

        $student = DB::transaction(function () use ($actor, $classes): User {
            $student = User::query()->forceCreate([
                'name' => 'Mahasiswa Uji SiPANDU',
                'email' => self::STUDENT_EMAIL,
                'identity_number' => null,
                'role' => UserRole::Student,
                'password' => $actor->getAuthPassword(),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            foreach ($classes as $courseClass) {
                $courseClass->memberships()->updateOrCreate(
                    ['user_id' => $student->id],
                    ['membership_role' => 'student', 'status' => 'active'],
                );
            }

            return $student;
        });

        return [
            'student_id' => $student->id,
            'student_email' => $student->email,
            'classes' => $seeded,
        ];
    }

    private function announcementBody(CourseClass $courseClass): string
    {
        $courseName = $courseClass->course?->name ?? 'mata kuliah ini';

        return "Selamat datang di {$courseName}. Pelajari materi pada Learning Timeline, tandai materi yang telah dipelajari, kerjakan tugas sesuai batas waktu, dan gunakan ruang diskusi bila ada pertanyaan.";
    }

    private function classLabel(string $name): string
    {
        return str_starts_with(strtolower(trim($name)), 'kelas ')
            ? trim($name)
            : 'Kelas '.trim($name);
    }
}
