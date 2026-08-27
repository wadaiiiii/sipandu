<?php

namespace App\Http\Controllers;

use App\Enums\RpsSourceType;
use App\Enums\UserRole;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseClass;
use App\Models\CourseClassMembership;
use App\Models\User;
use App\Services\Rps\RpsSnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CourseClassController extends Controller
{
    public function index(Request $request): JsonResponse
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
            'rps_source_type' => $class->rps_source_type,
            'rps_source_label' => RpsSourceType::tryFrom($class->rps_source_type)?->label() ?? $class->rps_source_type,
            'course' => $class->course,
            'academic_term' => $class->academicTerm,
            'students_count' => $class->students_count,
            'members' => $class->memberships->map(fn (CourseClassMembership $membership): array => [
                'id' => $membership->id,
                'membership_role' => $membership->membership_role,
                'status' => $membership->status,
                'user' => $membership->user,
            ])->values(),
        ]);

        return response()->json(['classes' => $classes]);
    }

    public function store(Request $request, RpsSnapshotService $snapshots): JsonResponse
    {
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

        $class = DB::transaction(function () use ($validated, $actor, $source, $snapshots): CourseClass {
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

        return response()->json(['ok' => true, 'class_id' => $class->id], 201);
    }

    public function addParticipant(Request $request, CourseClass $courseClass): JsonResponse
    {
        $this->ensureCanManageClass($request->user(), $courseClass);

        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $student = User::query()
            ->where('email', $validated['email'])
            ->where('role', UserRole::Student)
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
}
