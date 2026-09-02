<?php

use App\Http\Controllers\AssessmentCenterWithQuizController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ClassJournalController;
use App\Http\Controllers\ClassroomBootstrapController;
use App\Http\Controllers\ClassroomFileController;
use App\Http\Controllers\CourseClassAnnouncementController;
use App\Http\Controllers\CourseClassCommentController;
use App\Http\Controllers\CourseClassController;
use App\Http\Controllers\CourseClassDemoDataController;
use App\Http\Controllers\CourseClassJoinCodeController;
use App\Http\Controllers\CourseClassLearningController;
use App\Http\Controllers\CourseClassMaterialProgressController;
use App\Http\Controllers\CourseClassMaterialResourceController;
use App\Http\Controllers\CourseClassMeetingController;
use App\Http\Controllers\CourseClassQuizController;
use App\Http\Controllers\DashboardWithDemoController;
use App\Http\Controllers\FoundationController;
use App\Http\Controllers\ProductionSetupController;
use App\Http\Controllers\PasswordLifecycleController;
use App\Http\Controllers\SsoController;
use App\Http\Controllers\StudentClassProgressController;
use App\Http\Controllers\StudentPerformanceController;
use App\Http\Controllers\StudentSubmissionPolicyController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    \Log::info('SIPANDU ROOT HIT', [
        'method' => request()->method(),
        'url' => request()->fullUrl(),
        'base' => request()->getBaseUrl(),
    ]);

    return view('app');
});

Route::get('/pengguna', [UserManagementController::class, 'page'])->name('users.page');
Route::get('/setup', [ProductionSetupController::class, 'page'])->name('setup.page');
Route::post('/setup', [ProductionSetupController::class, 'run'])->name('setup.run');

Route::post('/login', [AuthController::class, 'login'])->middleware('guest')->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');
Route::get('/sso/start', [SsoController::class, 'start'])->middleware('guest')->name('sso.start');
Route::get('/sso/callback', [SsoController::class, 'callback'])->middleware('guest')->name('sso.callback');

Route::prefix('sipandu-api')->group(function (): void {
    Route::get('/bootstrap', FoundationController::class)->name('bootstrap');

    Route::middleware('auth')->group(function (): void {
        Route::put('/password/initial', [PasswordLifecycleController::class, 'update'])->name('password.initial');

        Route::get('/dashboard', DashboardWithDemoController::class)->name('dashboard');
        Route::get('/assessment-center', AssessmentCenterWithQuizController::class)->name('assessment-center');
        Route::get('/calendar', CalendarController::class)->name('calendar');
        Route::get('/student/performance', StudentPerformanceController::class)->name('student.performance');
        Route::get('/classes/{courseClass}/student-progress', StudentClassProgressController::class)->name('classes.student-progress');

        Route::get('/classes/{courseClass}/meetings', ClassroomBootstrapController::class)->name('classes.meetings.index');
        Route::patch('/classes/{courseClass}/meetings/{meeting}', [CourseClassMeetingController::class, 'update'])->name('classes.meetings.update');

        Route::get('/classes/{courseClass}/announcements', [CourseClassAnnouncementController::class, 'index'])->name('classes.announcements.index');
        Route::post('/classes/{courseClass}/announcements', [CourseClassAnnouncementController::class, 'store'])->name('classes.announcements.store');
        Route::delete('/classes/{courseClass}/announcements/{announcement}', [CourseClassAnnouncementController::class, 'destroy'])->name('classes.announcements.destroy');

        Route::get('/classes/{courseClass}/comments', [CourseClassCommentController::class, 'index'])->name('classes.comments.index');
        Route::post('/classes/{courseClass}/comments', [CourseClassCommentController::class, 'store'])->name('classes.comments.store');
        Route::delete('/classes/{courseClass}/comments/{comment}', [CourseClassCommentController::class, 'destroy'])->name('classes.comments.destroy');

        Route::post('/classes/{courseClass}/files', [ClassroomFileController::class, 'store'])->name('classes.files.store');
        Route::get('/classes/{courseClass}/files/{file}', [ClassroomFileController::class, 'show'])->name('classes.files.show');

        Route::get('/classes/{courseClass}/material-resources', [CourseClassMaterialResourceController::class, 'index'])->name('classes.materials.resources');
        Route::post('/classes/{courseClass}/meetings/{meeting}/materials', [CourseClassMaterialResourceController::class, 'store'])->name('classes.materials.store');
        Route::patch('/classes/{courseClass}/meetings/{meeting}/materials/{material}', [CourseClassMaterialResourceController::class, 'update'])->name('classes.materials.update');
        Route::delete('/classes/{courseClass}/meetings/{meeting}/materials/{material}', [CourseClassLearningController::class, 'destroyMaterial'])->name('classes.materials.destroy');
        Route::put('/classes/{courseClass}/materials/{material}/learned', [CourseClassMaterialProgressController::class, 'update'])->name('classes.materials.learned');
        Route::post('/classes/{courseClass}/meetings/{meeting}/assignments', [CourseClassLearningController::class, 'storeAssignment'])->name('classes.assignments.store');
        Route::patch('/classes/{courseClass}/assignments/{assignment}', [CourseClassLearningController::class, 'updateAssignment'])->name('classes.assignments.update');
        Route::get('/classes/{courseClass}/submission-policy', StudentSubmissionPolicyController::class)->name('classes.assignments.submission-policy');
        Route::post('/classes/{courseClass}/assignments/{assignment}/submission', [CourseClassLearningController::class, 'submitAssignment'])
            ->middleware('submission.window')
            ->name('classes.assignments.submit');
        Route::patch('/classes/{courseClass}/assignments/{assignment}/submissions/{submission}/grade', [CourseClassLearningController::class, 'gradeSubmission'])->name('classes.assignments.grade');
        Route::put('/classes/{courseClass}/meetings/{meeting}/attendance', [CourseClassLearningController::class, 'recordAttendance'])->name('classes.attendance.store');

        Route::get('/classes/{courseClass}/quizzes', [CourseClassQuizController::class, 'index'])->name('classes.quizzes.index');
        Route::post('/classes/{courseClass}/quizzes', [CourseClassQuizController::class, 'store'])->name('classes.quizzes.store');
        Route::get('/classes/{courseClass}/quizzes/{quiz}', [CourseClassQuizController::class, 'show'])->name('classes.quizzes.show');
        Route::patch('/classes/{courseClass}/quizzes/{quiz}', [CourseClassQuizController::class, 'update'])->name('classes.quizzes.update');
        Route::post('/classes/{courseClass}/quizzes/{quiz}/questions', [CourseClassQuizController::class, 'storeQuestion'])->name('classes.quizzes.questions.store');
        Route::patch('/classes/{courseClass}/quizzes/{quiz}/questions/{question}', [CourseClassQuizController::class, 'updateQuestion'])->name('classes.quizzes.questions.update');
        Route::delete('/classes/{courseClass}/quizzes/{quiz}/questions/{question}', [CourseClassQuizController::class, 'destroyQuestion'])->name('classes.quizzes.questions.destroy');
        Route::post('/classes/{courseClass}/quizzes/{quiz}/start', [CourseClassQuizController::class, 'start'])->name('classes.quizzes.start');
        Route::put('/classes/{courseClass}/quizzes/{quiz}/attempts/{attempt}/questions/{question}', [CourseClassQuizController::class, 'saveAnswer'])->name('classes.quizzes.answers.save');
        Route::post('/classes/{courseClass}/quizzes/{quiz}/attempts/{attempt}/submit', [CourseClassQuizController::class, 'submit'])->name('classes.quizzes.submit');
        Route::patch('/classes/{courseClass}/quizzes/{quiz}/attempts/{attempt}/answers/{answer}/grade', [CourseClassQuizController::class, 'gradeEssay'])->name('classes.quizzes.essay.grade');

        Route::get('/classes', [CourseClassController::class, 'index'])->name('classes.index');
        Route::post('/classes', [CourseClassController::class, 'store'])->name('classes.store');
        Route::post('/classes/join', [CourseClassController::class, 'join'])->middleware('throttle:10,1')->name('classes.join');
        Route::patch('/classes/{courseClass}/join-code', [CourseClassJoinCodeController::class, 'update'])->name('classes.join-code.update');
        Route::patch('/classes/{courseClass}/join-requests/{membership}/approve', [CourseClassController::class, 'approveJoinRequest'])->name('classes.join-requests.approve');
        Route::patch('/classes/{courseClass}/join-requests/{membership}/reject', [CourseClassController::class, 'rejectJoinRequest'])->name('classes.join-requests.reject');
        Route::post('/classes/{courseClass}/demo-data', CourseClassDemoDataController::class)->name('classes.demo-data');
        Route::delete('/classes/{courseClass}', [CourseClassController::class, 'destroy'])->name('classes.destroy');
        Route::post('/classes/{courseClass}/participants', [CourseClassController::class, 'addParticipant'])->name('classes.participants.store');
        Route::delete('/classes/{courseClass}/participants/{user}', [CourseClassController::class, 'removeParticipant'])->name('classes.participants.destroy');
        Route::post('/classes/{courseClass}/lecturers', [CourseClassController::class, 'addLecturer'])->name('classes.lecturers.store');
        Route::delete('/classes/{courseClass}/lecturers/{user}', [CourseClassController::class, 'removeLecturer'])->name('classes.lecturers.destroy');
        Route::post('/classes/{courseClass}/student-roster', [CourseClassController::class, 'importStudentRoster'])->name('classes.student-roster.store');

        Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
        Route::patch('/users/{user}/status', [UserManagementController::class, 'updateStatus'])->name('users.status');
        Route::post('/users/{user}/reset-password', [UserManagementController::class, 'resetPassword'])->name('users.reset-password');
    });
});

Route::get('/kelas/{courseClass}/jurnal', ClassJournalController::class)
    ->middleware('auth')
    ->name('classes.journal');

Route::view('/kelas/{courseClass}/kuis', 'quiz')
    ->middleware('auth')
    ->name('classes.quizzes.page');

Route::get('/kelas/{courseClass}', [CourseClassMeetingController::class, 'page'])
    ->middleware('auth')
    ->name('classes.show');
