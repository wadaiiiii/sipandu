<?php

namespace App\Services\Classroom;

use App\Enums\UserRole;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseClass;
use App\Models\CourseClassAnnouncement;
use App\Models\User;

class DemoCycleSeeder
{
    public const COURSE_CODE = 'DEMO101';

    public function __construct(
        private readonly CourseClassMeetingService $meetingService,
    ) {}

    public function seedIfNeeded(User $actor): ?array
    {
        if ($actor->role !== UserRole::AdminProdi) {
            return null;
        }

        $course = Course::query()->firstOrCreate(
            ['code' => self::COURSE_CODE],
            ['name' => 'Simulasi Pembelajaran SiPANDU', 'credits' => 2],
        );

        $term = AcademicTerm::query()
            ->where('is_active', true)
            ->latest('id')
            ->first()
            ?? AcademicTerm::query()->firstOrCreate(
                ['academic_year' => '2026/2027', 'semester' => 'ganjil'],
                ['is_active' => true],
            );

        $courseClass = CourseClass::query()->firstOrCreate(
            [
                'course_id' => $course->id,
                'academic_term_id' => $term->id,
                'name' => 'Demo',
            ],
            [
                'status' => 'draft',
                'rps_source_type' => 'manual',
                'created_by' => $actor->id,
            ],
        );

        $courseClass->memberships()->updateOrCreate(
            ['user_id' => $actor->id],
            ['membership_role' => 'lecturer', 'status' => 'active'],
        );

        $this->meetingService->ensureDefaultSlots($courseClass);
        $this->seedMeetings($courseClass);
        $created = $this->seedLearningContent($courseClass, $actor);

        CourseClassAnnouncement::query()->firstOrCreate(
            [
                'course_class_id' => $courseClass->id,
                'body' => 'Selamat datang di Kelas Demo SiPANDU. Gunakan kelas ini untuk mencoba satu siklus lengkap: bergabung dengan kode kelas, membaca materi, menandai materi selesai, mengerjakan tugas, berdiskusi, menerima nilai dan feedback, lalu melihat perubahan pada SiPANDU Today serta Jurnal Kelas.',
            ],
            [
                'is_pinned' => true,
                'created_by' => $actor->id,
            ],
        );

        return [
            'class_id' => $courseClass->id,
            'course_code' => self::COURSE_CODE,
            'created' => $created,
        ];
    }

    private function seedMeetings(CourseClass $courseClass): void
    {
        $titles = [
            1 => ['Orientasi Kelas dan Alur SiPANDU', 'Pengenalan Learning Timeline, materi, tugas, diskusi, dan jurnal kelas.'],
            2 => ['Literasi Digital Dasar', 'Mengenali informasi digital yang relevan dan dapat dipercaya.'],
            3 => ['Pencarian dan Evaluasi Informasi', 'Strategi mencari, membandingkan, dan mengevaluasi sumber informasi.'],
            4 => ['Kolaborasi Daring', 'Prinsip kerja kelompok dan kolaborasi akademik secara daring.'],
            5 => ['Komunikasi Akademik Digital', 'Etika dan teknik komunikasi akademik melalui media digital.'],
            6 => ['Pengelolaan Tugas dan Waktu', 'Strategi mengelola deadline, prioritas, dan bukti penyelesaian tugas.'],
            7 => ['Diskusi Studi Kasus', 'Menerapkan konsep melalui diskusi kasus pembelajaran digital.'],
            8 => ['Evaluasi Tengah Siklus', 'Refleksi kemajuan dan evaluasi pembelajaran paruh semester.'],
            9 => ['Etika Digital', 'Hak, tanggung jawab, jejak digital, dan perilaku etis.'],
            10 => ['Keamanan Digital', 'Praktik keamanan akun, data, dan perangkat.'],
            11 => ['Pengelolaan Data Pembelajaran', 'Mengorganisasi file, data, dan dokumentasi aktivitas belajar.'],
            12 => ['Presentasi Digital', 'Menyusun presentasi akademik yang ringkas dan komunikatif.'],
            13 => ['Proyek Mini', 'Perencanaan dan pelaksanaan proyek mini berbasis kolaborasi.'],
            14 => ['Konsultasi Proyek', 'Review progres, kendala, dan perbaikan proyek.'],
            15 => ['Presentasi Proyek', 'Penyajian hasil proyek dan umpan balik sejawat.'],
            16 => ['Refleksi dan Evaluasi Akhir', 'Refleksi capaian belajar dan dokumentasi portofolio kelas.'],
        ];

        foreach ($titles as $number => [$title, $summary]) {
            $courseClass->meetings()
                ->where('meeting_number', $number)
                ->update([
                    'title' => $title,
                    'topic' => $title,
                    'learning_method' => in_array($number, [4, 7, 13, 15], true) ? 'Case Method / Project' : 'Diskusi dan latihan',
                    'learning_activity' => $summary,
                    'material_summary' => $summary,
                ]);
        }
    }

    private function seedLearningContent(CourseClass $courseClass, User $actor): array
    {
        $meetings = $courseClass->meetings()->get()->keyBy('meeting_number');

        $materials = [
            [1, 'Panduan Memulai Kelas di SiPANDU', 'Pelajari alur kelas: Learning Timeline → Materi → Tandai Selesai → Tugas → Diskusi → Nilai dan Feedback → Jurnal Kelas.'],
            [2, 'Modul Literasi Digital Dasar', 'Ringkasan konsep literasi digital, kredibilitas sumber, konteks informasi, dan contoh penerapan dalam kegiatan akademik.'],
            [3, 'Checklist Evaluasi Sumber Informasi', 'Gunakan checklist otoritas sumber, akurasi, kebaruan, tujuan publikasi, dan bukti pendukung untuk menilai sebuah sumber.'],
            [4, 'Panduan Kolaborasi Daring', 'Prinsip pembagian peran, komunikasi, dokumentasi keputusan, dan penyelesaian konflik dalam kerja kelompok daring.'],
            [9, 'Ringkasan Etika dan Jejak Digital', 'Materi tentang hak cipta, sitasi, privasi, jejak digital, serta tanggung jawab dalam komunikasi daring.'],
            [13, 'Panduan Proyek Mini SiPANDU', 'Petunjuk proyek mini: identifikasi masalah, pembagian peran, bukti proses, produk akhir, presentasi, dan refleksi.'],
        ];

        $assignments = [
            [2, 'Latihan 1 — Evaluasi Informasi Digital', 'Pilih satu artikel daring. Jelaskan siapa penerbitnya, kapan diterbitkan, bukti yang digunakan, potensi bias, dan simpulkan apakah sumber tersebut layak digunakan untuk tugas akademik.', 3, 10],
            [4, 'Tugas 1 — Rencana Kolaborasi Daring', 'Susun rencana kerja kelompok singkat yang memuat tujuan, pembagian peran, media komunikasi, jadwal, mekanisme dokumentasi, dan cara menangani keterlambatan anggota.', 7, 20],
            [6, 'Tugas 2 — Rencana Belajar Mingguan', 'Buat rencana belajar satu minggu yang memuat prioritas tugas, estimasi waktu, deadline, serta strategi jika terjadi perubahan jadwal.', 10, 20],
            [13, 'Proyek Mini — Portofolio Pembelajaran Digital', 'Buat portofolio mini yang mendokumentasikan satu proses belajar: tujuan, sumber yang digunakan, hasil kerja, refleksi, dan satu perbaikan yang akan dilakukan pada aktivitas berikutnya.', 14, 50],
        ];

        $createdMaterials = 0;
        foreach ($materials as [$meetingNumber, $title, $description]) {
            $material = $meetings[$meetingNumber]->materials()->firstOrCreate(
                ['title' => $title],
                [
                    'resource_type' => 'reading',
                    'description' => $description,
                    'resource_url' => null,
                    'is_published' => true,
                    'created_by' => $actor->id,
                ],
            );
            if ($material->wasRecentlyCreated) {
                $createdMaterials++;
            }
        }

        $createdAssignments = 0;
        foreach ($assignments as [$meetingNumber, $title, $instructions, $days, $weight]) {
            $assignment = $meetings[$meetingNumber]->assignments()->firstOrCreate(
                ['title' => $title],
                [
                    'instructions' => $instructions,
                    'sub_cpmk_code' => null,
                    'weight_percent' => $weight,
                    'max_score' => 100,
                    'due_at' => now()->addDays($days),
                    'status' => 'published',
                    'created_by' => $actor->id,
                ],
            );
            if ($assignment->wasRecentlyCreated) {
                $createdAssignments++;
            }
        }

        return [
            'materials' => $createdMaterials,
            'assignments' => $createdAssignments,
        ];
    }
}
