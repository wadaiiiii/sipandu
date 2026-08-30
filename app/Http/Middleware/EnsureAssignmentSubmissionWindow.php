<?php

namespace App\Http\Middleware;

use App\Models\CourseClassAssignment;
use App\Models\CourseClassSubmission;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class EnsureAssignmentSubmissionWindow
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('classes.assignments.submit')) {
            return $next($request);
        }

        $assignment = $request->route('assignment');
        if (! $assignment instanceof CourseClassAssignment) {
            return $next($request);
        }

        if ($assignment->status !== 'published') {
            throw ValidationException::withMessages([
                'assignment' => 'Tugas sudah ditutup dan tidak dapat dikumpulkan atau diperbarui.',
            ]);
        }

        if ($assignment->due_at && now()->greaterThan($assignment->due_at)) {
            throw ValidationException::withMessages([
                'assignment' => 'Batas waktu tugas telah lewat. Jawaban tidak dapat dikumpulkan atau diperbarui.',
            ]);
        }

        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $submission = CourseClassSubmission::query()
            ->where('course_class_assignment_id', $assignment->id)
            ->where('user_id', $user->id)
            ->first();

        if ($submission?->graded_at) {
            throw ValidationException::withMessages([
                'assignment' => 'Tugas sudah dinilai dosen sehingga jawaban tidak dapat diperbarui.',
            ]);
        }

        return $next($request);
    }
}
