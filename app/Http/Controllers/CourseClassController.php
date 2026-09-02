<?php

namespace App\Http\Controllers;

use App\Enums\RpsSourceType;
use App\Enums\UserRole;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseClass;
use App\Models\CourseClassMembership;
use App\Models\User;
use App\Services\Classroom\ClassJoinCodeService;
use App\Services\Classroom\CourseClassMeetingService;
use App\Services\Rps\RpsSnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CourseClassController extends Controller
{
    public function index(Request $request, ClassJoinCodeService $joinCodes): JsonResponse
    {
        $user = $request->user();

        $query = CourseClass::query()
            ->with([
                'course:id,code,name,credits',
                'academicTerm:id,academic_year,semester,is_active',
                'memberships.user:id,name,email,identity_number,role',
            ])
            ->withCount(['memberships as students_count' => fn ($membership) => $membership->where('membership_role', 'student')->where('status', 'active')])
            ->latest();

        if (! in_array($user->role, [UserRole::AdminProdi, UserRole::Upm], true)) {
            $query->whereHas('memberships', fn ($membership) => $membership->where('user_id', $user->id)->where('status', 'active'));
        }

        $classes = $query->get()->map(fn (CourseClass $class): array => [
            'id' => $class->id,
            'name' => $class->name,
            'status' => $class->status,
            'detail_url' => "/kelas/{$class->id}",
            'join_code' => $joinCodes->for($class),
            'rps_source_type' => $class->rps_source_type,
            'rps_source_label' => RpsSourceType::tryFrom($class->rps_source_type)?->label() ?? $class->rps_source_type,
            'course' => $class->course,
            'academic_term' => $class->academicTerm,
            'students_count' => $class->students_count,
            'members' => $class->memberships->map(fn (CourseClassMembership $membership): array => [
                'id' => $membership->id,
                'membership_role' => $membership->membership_role,
                'status' => $membership->status,
                'requested_at' => $membership->updated_at?->toIso8601String(),
                'user' => $membership->user,
            ])->values(),
        ]);

        return response()->json(['classes' => $classes]);
    }

    public function store(
        Request $request,
        RpsSnapshotService $snapshots,
        CourseClassMeetingService $meetings,
        ClassJoinCodeService $joinCodes,
    ): JsonResponse {
        $this->ensureCanManageClasses($request->user());

        $validated = $request->validate([
            'course_code' => ['required', 'string', 'max:40'],
            'course_name' => ['required', 'string', 'max:180'],
            'credits' => ['required', 'integer', 'min:1', 'max:12'],
            'academic_year' => ['required', 'string', 'max:20'],
            'semester' => ['required', Rule::in(['ganjil', 'genap'])],
            'class_name' => ['required', 'string', 'max:120'],
            'rps_source_type' => ['required', Rule::enum(RpsSourceType::class)],
        ]);

        $actor = $request->user();
        $source = RpsSourceType::from($validated['rps_source_type']);

        $class = DB::transaction(function () use ($validated, $actor, $source, $snapshots, $meetings): CourseClass {
            $course = Course::query()->updateOrCreate(
                ['code' => trim($validated['course_code'])],
                ['name' => trim($validated['course_name']), 'credits' => $validated['credits']],
            );

            $term = AcademicTerm::query()->firstOrCreate(
                ['academic_year' => trim($validated['academic_year']), 'semester' => $validated['semester']],
                ['is_active' => true],
            );

            $class = CourseClass::query()->create([
                'course_id' => $course->id,
                'academic_term_id' => $term->id,
                'name' => trim($validated['class_name']),
                'status' => 'draft',
                'rps_source_type' => $source->value,
                'created_by' => $actor->id,
            ]);

            $class->memberships()->create([
                'user_id' => $actor->id,
                'membership_role' => 'lecturer',
                'status' => 'active',
            ]);

            $meetings->ensureDefaultSlots($class);

            if ($source === RpsSourceType::Manual) {
                $snapshots->capture(
                    $class,
                    $source,
                    [
                        'schema' => 'sipandu.rps.manual.v1',
                        'sub_cpmk' => [],
                        'meetings' => [],
                        'assessments' => [],
                    ],
                    actor: $actor,
                );
            }

            return $class;
        });

        return response()->json([
            'ok' => true,
            'class_id' => $class->id,
            'detail_url' => "/kelas/{$class->id}",
            'join_code' => $joinCodes->for($class),
        ], 201);
    }

    public function join(Request $request, ClassJoinCodeService $joinCodes): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === UserRole::Student, 403);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:30'],
        ]);

        $courseClass = $joinCodes->resolve($validated['code']);
        if (! $courseClass) {
            throw ValidationException::withMessages([
                'code' => 'Kode kelas tidak valid. Periksa kembali kode dari dosen.',
            ]);
        }

        $membership = $courseClass->memberships()
            ->where('user_id', $user->id)
            ->first();

        if ($membership?->membership_role === 'student' && $membership->status === 'active') {
            return response()->json([
                'ok' => true,
                'status' => 'active',
                'auto_approved' => true,
                'already_member' => true,
                'message' => 'Anda sudah terdaftar sebagai peserta aktif kelas ini.',
                'class_id' => $courseClass->id,
                'detail_url' => "/kelas/{$courseClass->id}",
            ]);
        }

        if ($membership?->membership_role === 'student' && in_array($membership->status, ['roster', 'invited'], true)) {
            $membership->update(['status' => 'active']);

            return response()->json([
                'ok' => true,
                'status' => 'active',
                'auto_approved' => true,
                'already_member' => false,
                'message' => 'NIM Anda sudah terdaftar pada roster kelas. Anda otomatis diterima.',
                'class_id' => $courseClass->id,
                'detail_url' => "/kelas/{$courseClass->id}",
            ]);
        }

        if ($membership?->membership_role === 'student' && $membership->status === 'pending') {
            return response()->json([
                'ok' => true,
                'status' => 'pending',
                'auto_approved' => false,
                'message' => 'Permintaan bergabung sudah dikirim dan masih menunggu persetujuan dosen.',
                'class_id' => $courseClass->id,
            ], 202);
        }

        $membership = $courseClass->memberships()->updateOrCreate(
            ['user_id' => $user->id],
            ['membership_role' => 'student', 'status' => 'pending'],
        );

        return response()->json([
            'ok' => true,
            'status' => 'pending',
            'auto_approved' => false,
            'message' => 'Permintaan bergabung telah dikirim. Menunggu persetujuan dosen.',
            'class_id' => $courseClass->id,
            'membership_id' => $membership->id,
        ], 202);
    }

    public function approveJoinRequest(Request $request, CourseClass $courseClass, CourseClassMembership $membership): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);
        $this->ensureJoinRequestBelongsToClass($courseClass, $membership);

        if ($membership->status !== 'pending') {
            throw ValidationException::withMessages([
                'membership' => 'Permintaan ini sudah diproses.',
            ]);
        }

        $membership->update(['status' => 'active']);

        return response()->json([
            'ok' => true,
            'status' => 'active',
            'message' => 'Permintaan bergabung diterima.',
        ]);
    }

    public function rejectJoinRequest(Request $request, CourseClass $courseClass, CourseClassMembership $membership): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);
        $this->ensureJoinRequestBelongsToClass($courseClass, $membership);

        if ($membership->status !== 'pending') {
            throw ValidationException::withMessages([
                'membership' => 'Permintaan ini sudah diproses.',
            ]);
        }

        $membership->update(['status' => 'rejected']);

        return response()->json([
            'ok' => true,
            'status' => 'rejected',
            'message' => 'Permintaan bergabung ditolak.',
        ]);
    }

    public function destroy(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);

        DB::transaction(function () use ($courseClass): void {
            $courseClass->delete();
        });

        return response()->json([
            'ok' => true,
            'message' => 'Kelas berhasil dihapus beserta data pembelajarannya.',
        ]);
    }

    public function addParticipant(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);

        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $student = User::query()
            ->where('email', $validated['email'])
            ->where('role', UserRole::Student->value)
            ->where('is_active', true)
            ->first();

        if (! $student) {
            throw ValidationException::withMessages([
                'email' => 'Mahasiswa aktif dengan email tersebut belum terdaftar di SiPANDU.',
            ]);
        }

        $courseClass->memberships()->updateOrCreate(
            ['user_id' => $student->id],
            ['membership_role' => 'student', 'status' => 'active'],
        );

        return response()->json(['ok' => true]);
    }

    public function removeParticipant(Request $request, CourseClass $courseClass, User $user): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);

        $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('membership_role', 'student')
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function addLecturer(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);

        $validated = $request->validate(['email' => ['required', 'email']]);
        $lecturer = User::query()
            ->whereRaw('LOWER(email) = ?', [Str::lower($validated['email'])])
            ->where('role', UserRole::Lecturer->value)
            ->where('is_active', true)
            ->first();

        if (! $lecturer) {
            throw ValidationException::withMessages([
                'email' => 'Dosen aktif dengan email tersebut belum terdaftar di SiPANDU.',
            ]);
        }

        $courseClass->memberships()->updateOrCreate(
            ['user_id' => $lecturer->id],
            ['membership_role' => 'lecturer', 'status' => 'active'],
        );

        return response()->json(['ok' => true, 'message' => 'Dosen partner ditambahkan ke kelas.']);
    }

    public function removeLecturer(Request $request, CourseClass $courseClass, User $user): JsonResponse
    {
        $actor = $request->user();
        $this->ensureCanManageClass($actor, $courseClass);

        $membership = $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('membership_role', 'lecturer')
            ->where('status', 'active')
            ->firstOrFail();

        $activeLecturers = $courseClass->memberships()
            ->where('membership_role', 'lecturer')
            ->where('status', 'active')
            ->count();

        abort_if($activeLecturers <= 1, 422, 'Kelas harus memiliki minimal satu dosen aktif.');
        abort_if($actor->id === $user->id && $actor->role !== UserRole::AdminProdi, 422, 'Dosen tidak dapat mengeluarkan dirinya sendiri.');

        $membership->delete();

        return response()->json(['ok' => true, 'message' => 'Dosen partner dikeluarkan dari kelas.']);
    }

    public function importStudentRoster(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);

        $validated = $request->validate([
            'students' => ['required', 'array', 'min:1', 'max:500'],
            'students.*.nim' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9.-]+$/'],
            'students.*.name' => ['required', 'string', 'max:180'],
        ]);

        $credentials = [];
        $created = 0;
        $enrolled = 0;

        DB::transaction(function () use ($validated, $courseClass, &$credentials, &$created, &$enrolled): void {
            foreach (collect($validated['students'])->unique(fn (array $row) => Str::upper(trim($row['nim']))) as $row) {
                $nim = Str::upper(trim($row['nim']));
                $name = trim($row['name']);
                $student = User::query()->whereRaw('UPPER(identity_number) = ?', [$nim])->first();

                if (! $student) {
                    $password = Str::password(12, symbols: false);
                    $emailStem = Str::lower(preg_replace('/[^A-Za-z0-9.-]/', '', $nim) ?: Str::random(12));
                    $email = $emailStem.'@student.unsulbar.local';

                    $student = User::query()->create([
                        'name' => $name,
                        'email' => $email,
                        'identity_number' => $nim,
                        'role' => UserRole::Student->value,
                        'password' => Hash::make($password),
                        'is_active' => true,
                        'must_change_password' => true,
                        'email_verified_at' => now(),
                    ]);
                    $credentials[] = ['nim' => $nim, 'name' => $name, 'password' => $password];
                    $created++;
                } else {
                    abort_unless($student->role === UserRole::Student, 422, "NIM {$nim} sudah dipakai akun non-mahasiswa.");
                    $student->forceFill(['name' => $name, 'is_active' => true])->save();
                }

                $courseClass->memberships()->updateOrCreate(
                    ['user_id' => $student->id],
                    ['membership_role' => 'student', 'status' => 'active'],
                );
                $enrolled++;
            }
        });

        return response()->json([
            'ok' => true,
            'created_accounts' => $created,
            'enrolled_students' => $enrolled,
            'credentials' => $credentials,
            'message' => "{$enrolled} mahasiswa berhasil dimasukkan ke kelas.",
        ]);
    }

    private function ensureCanManageClasses(User $user): void
    {
        abort_unless(in_array($user->role, [UserRole::AdminProdi, UserRole::Lecturer], true), 403);
    }

    private function ensureCanManageClass(User $user, CourseClass $courseClass): void
    {
        if ($user->role === UserRole::AdminProdi) {
            return;
        }

        abort_unless(
            $user->role === UserRole::Lecturer
            && $courseClass->memberships()->where('user_id', $user->id)->where('membership_role', 'lecturer')->where('status', 'active')->exists(),
            403,
        );
    }

    private function ensureJoinRequestBelongsToClass(CourseClass $courseClass, CourseClassMembership $membership): void
    {
        abort_unless(
            $membership->course_class_id === $courseClass->id
            && $membership->membership_role === 'student',
            404,
        );
    }
}
