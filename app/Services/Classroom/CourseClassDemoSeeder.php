<?php

namespace App\Services\Classroom;

use App\Models\CourseClass;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CourseClassDemoSeeder
{
    public function __construct(
        private readonly CourseClassMeetingService $meetingService,
    ) {}

    public function seed(CourseClass $courseClass, User $actor): array
    {
        $this->meetingService->ensureDefaultSlots($courseClass);
        $courseClass->loadMissing('course:id,name');
        $meetings = $courseClass->meetings()->orderBy('meeting_number')->take(4)->get()->keyBy('meeting_number');

        if ($meetings->count() < 4) {
            throw ValidationException::withMessages([
                'class' => 'Pertemuan kelas belum siap. Buka ruang kelas sekali lalu coba kembali.',
            ]);
        }

        $isAlgorithm = str_contains(strtolower((string) $courseClass->course?->name), 'algoritma');
        $materials = $isAlgorithm ? $this->algorithmMaterials() : $this->genericMaterials($courseClass->course?->name ?? 'Mata Kuliah');
        $assignments = $isAlgorithm ? $this->algorithmAssignments() : $this->genericAssignments();

        $createdMaterials = 0;
        $createdAssignments = 0;

        DB::transaction(function () use (
            $materials,
            $assignments,
            $meetings,
            $actor,
            &$createdMaterials,
            &$createdAssignments,
        ): void {
            foreach ($materials as $item) {
                $material = $meetings[$item['meeting']]->materials()->firstOrCreate(
                    ['title' => $item['title']],
                    [
                        'resource_type' => 'reading',
                        'description' => $item['description'],
                        'resource_url' => null,
                        'is_published' => true,
                        'created_by' => $actor->id,
                    ],
                );

                if ($material->wasRecentlyCreated) {
                    $createdMaterials++;
                }
            }

            foreach ($assignments as $index => $item) {
                $assignment = $meetings[$item['meeting']]->assignments()->firstOrCreate(
                    ['title' => $item['title']],
                    [
                        'instructions' => $item['instructions'],
                        'sub_cpmk_code' => null,
                        'weight_percent' => 10,
                        'max_score' => 100,
                        'due_at' => now()->addDays(7 + ($index * 7)),
                        'status' => 'published',
                        'created_by' => $actor->id,
                    ],
                );

                if ($assignment->wasRecentlyCreated) {
                    $createdAssignments++;
                }
            }
        });

        return [
            'materials' => $createdMaterials,
            'assignments' => $createdAssignments,
        ];
    }

    private function algorithmMaterials(): array
    {
        return [
            ['meeting' => 1, 'title' => 'Pengantar Algoritma dan Pemrograman', 'description' => 'Konsep algoritma, karakteristik algoritma yang baik, pseudocode, flowchart, serta hubungan algoritma dengan program.'],
            ['meeting' => 2, 'title' => 'Variabel, Tipe Data, dan Operator', 'description' => 'Pengenalan variabel, konstanta, tipe data dasar, operator aritmatika, relasional, dan logika melalui contoh sederhana.'],
            ['meeting' => 3, 'title' => 'Percabangan dan Logika Kondisional', 'description' => 'Struktur if, if-else, kondisi bertingkat, dan penerapan logika kondisional untuk penyelesaian masalah.'],
            ['meeting' => 4, 'title' => 'Perulangan', 'description' => 'Konsep for, while, dan do-while serta pemilihan struktur perulangan sesuai karakter masalah.'],
        ];
    }

    private function algorithmAssignments(): array
    {
        return [
            ['meeting' => 2, 'title' => 'Latihan 1 — Variabel dan Operator', 'instructions' => 'Buat pseudocode untuk menghitung nilai akhir mahasiswa dari tiga komponen penilaian. Jelaskan variabel dan operator yang digunakan.'],
            ['meeting' => 3, 'title' => 'Tugas 1 — Percabangan', 'instructions' => 'Buat algoritma yang menentukan kategori nilai A, B, C, D, atau E berdasarkan nilai numerik. Sertakan pseudocode atau flowchart.'],
            ['meeting' => 4, 'title' => 'Tugas 2 — Perulangan', 'instructions' => 'Buat algoritma yang menampilkan bilangan 1–100, menghitung jumlah bilangan genap, dan menjelaskan struktur perulangan yang dipilih.'],
        ];
    }

    private function genericMaterials(string $courseName): array
    {
        return [
            ['meeting' => 1, 'title' => "Materi 1 — Pengantar {$courseName}", 'description' => 'Materi pengantar untuk memahami ruang lingkup, istilah utama, dan tujuan pembelajaran mata kuliah.'],
            ['meeting' => 2, 'title' => 'Materi 2 — Konsep Dasar', 'description' => 'Ringkasan konsep dasar dan terminologi penting sebagai fondasi pembelajaran pada pertemuan berikutnya.'],
            ['meeting' => 3, 'title' => 'Materi 3 — Studi Kasus', 'description' => 'Contoh kasus sederhana untuk menghubungkan konsep dengan situasi atau permasalahan nyata.'],
            ['meeting' => 4, 'title' => 'Materi 4 — Latihan Terapan', 'description' => 'Materi latihan yang mengarahkan mahasiswa menerapkan konsep yang sudah dipelajari.'],
        ];
    }

    private function genericAssignments(): array
    {
        return [
            ['meeting' => 2, 'title' => 'Latihan 1 — Pemahaman Konsep Dasar', 'instructions' => 'Jelaskan tiga konsep utama dari materi pertemuan dan berikan satu contoh penerapannya.'],
            ['meeting' => 3, 'title' => 'Tugas 1 — Analisis Studi Kasus', 'instructions' => 'Analisis studi kasus yang diberikan menggunakan konsep yang telah dipelajari. Susun jawaban secara ringkas dan sistematis.'],
            ['meeting' => 4, 'title' => 'Tugas 2 — Latihan Terapan', 'instructions' => 'Kerjakan latihan terapan sesuai materi pertemuan dan jelaskan langkah penyelesaiannya.'],
        ];
    }
}
