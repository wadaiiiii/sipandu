<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassUploadedFile;
use App\Models\User;
use App\Services\Storage\ClassroomFileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use RuntimeException;

class ClassroomFileController extends Controller
{
    public function store(
        Request $request,
        CourseClass $courseClass,
        ClassroomFileStorage $storage,
    ): JsonResponse {
        $validated = $request->validate([
            'purpose' => ['required', Rule::in(['material', 'assignment', 'submission'])],
            'file' => [
                'required',
                'file',
                'max:4096',
                'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,csv,txt,zip,png,jpg,jpeg,webp',
            ],
        ]);

        $user = $request->user();
        $purpose = $validated['purpose'];

        if ($purpose === 'submission') {
            abort_unless(
                $user->role === UserRole::Student && $this->isActiveMember($user, $courseClass, 'student'),
                403,
            );
        } else {
            abort_unless($this->canEdit($user, $courseClass), 403);
        }

        try {
            $stored = $storage->put($request->file('file'), $courseClass->id, $purpose);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 503);
        }

        $file = CourseClassUploadedFile::query()->create([
            'course_class_id' => $courseClass->id,
            'uploaded_by' => $user->id,
            'purpose' => $purpose,
            'original_name' => $request->file('file')->getClientOriginalName(),
            'mime_type' => $stored['content_type'],
            'size_bytes' => $request->file('file')->getSize() ?: 0,
            'blob_url' => $stored['url'],
            'blob_pathname' => $stored['pathname'],
        ]);

        return response()->json([
            'file' => [
                'id' => $file->id,
                'name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
                'url' => route('classes.files.show', [$courseClass, $file]),
            ],
        ], 201);
    }

    public function show(
        Request $request,
        CourseClass $courseClass,
        CourseClassUploadedFile $file,
        ClassroomFileStorage $storage,
    ): Response {
        abort_unless($file->course_class_id === $courseClass->id, 404);
        abort_unless($this->canView($request->user(), $courseClass), 403);

        try {
            $stored = $storage->get($file->blob_url);
        } catch (RuntimeException $exception) {
            report($exception);
            abort(503, $exception->getMessage());
        }

        $downloadName = str_replace(['"', "\r", "\n"], '', $file->original_name);

        return response($stored['body'], 200, [
            'Content-Type' => $stored['content_type'] ?: ($file->mime_type ?: 'application/octet-stream'),
            'Content-Disposition' => 'attachment; filename="'.$downloadName.'"',
            'Cache-Control' => 'private, max-age=60',
        ]);
    }

    private function canView(User $user, CourseClass $courseClass): bool
    {
        if (in_array($user->role, [UserRole::AdminProdi, UserRole::Upm], true)) {
            return true;
        }

        return $this->isActiveMember($user, $courseClass);
    }

    private function canEdit(User $user, CourseClass $courseClass): bool
    {
        if ($user->role === UserRole::AdminProdi) {
            return true;
        }

        return $user->role === UserRole::Lecturer
            && $this->isActiveMember($user, $courseClass, 'lecturer');
    }

    private function isActiveMember(User $user, CourseClass $courseClass, ?string $membershipRole = null): bool
    {
        $query = $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('status', 'active');

        if ($membershipRole) {
            $query->where('membership_role', $membershipRole);
        }

        return $query->exists();
    }
}
