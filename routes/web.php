<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClassJournalController;
use App\Http\Controllers\ClassroomBootstrapController;
use App\Http\Controllers\ClassroomFileController;
use App\Http\Controllers\CourseClassAnnouncementController;
use App\Http\Controllers\CourseClassController;
use App\Http\Controllers\CourseClassLearningController;
use App\Http\Controllers\CourseClassMaterialProgressController;
use App\Http\Controllers\CourseClassMeetingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FoundationController;
use App\Http\Controllers\ProductionSetupController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'app');
Route::get('/pengguna', [UserManagementController::class, 'page'])->name('users.page');
Route::get('/setup', [ProductionSetupController::class, 'page'])->name('setup.page');
Route::post('/setup', [ProductionSetupController::class, 'run'])->name('setup.run');

Route::post('/login', [AuthController::class, 'login'])->middleware('guest')->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

Route::prefix('sipandu-api')->group(function (): void {
    Route::get('/bootstrap', FoundationController::class)->name('bootstrap');

    Route::middleware('auth')->group(function (): void {
        Route::get('/dashboard', DashboardController::class)->name('dashboard');

        Route::get('/classes/{courseClass}/meetings', ClassroomBootstrapController::class)->name('classes.meetings.index');
        Route::patch('/classes/{courseClass}/meetings/{meeting}', [CourseClassMeetingController::class, 'update'])->name('classes.meetings.update');

        Route::get('/classes/{courseClass}/announcements', [CourseClassAnnouncementController::class, 'index'])->name('classes.announcements.index');
        Route::post('/classes/{courseClass}/announcements', [CourseClassAnnouncementController::class, 'store'])->name('classes.announcements.store');
        Route::delete('/classes/{courseClass}/announcements/{announcement}', [CourseClassAnnouncementController::class, 'destroy'])->name('classes.announcements.destroy');

        Route::post('/classes/{courseClass}/files', [ClassroomFileController::class, 'store'])->name('classes.files.store');
        Route::get('/classes/{courseClass}/files/{file}', [ClassroomFileController::class, 'show'])->name('classes.files.show');

        Route::post('/classes/{courseClass}/meetings/{meeting}/materials', [CourseClassLearningController::class, 'storeMaterial'])->name('classes.materials.store');
        Route::delete('/classes/{courseClass}/meetings/{meeting}/materials/{material}', [CourseClassLearningController::class, 'destroyMaterial'])->name('classes.materials.destroy');
        Route::put('/classes/{courseClass}/materials/{material}/learned', [CourseClassMaterialProgressController::class, 'update'])->name('classes.materials.learned');
        Route::post('/classes/{courseClass}/meetings/{meeting}/assignments', [CourseClassLearningController::class, 'storeAssignment'])->name('classes.assignments.store');
        Route::patch('/classes/{courseClass}/assignments/{assignment}', [CourseClassLearningController::class, 'updateAssignment'])->name('classes.assignments.update');
        Route::post('/classes/{courseClass}/assignments/{assignment}/submission', [CourseClassLearningController::class, 'submitAssignment'])->name('classes.assignments.submit');
        Route::patch('/classes/{courseClass}/assignments/{assignment}/submissions/{submission}/grade', [CourseClassLearningController::class, 'gradeSubmission'])->name('classes.assignments.grade');
        Route::put('/classes/{courseClass}/meetings/{meeting}/attendance', [CourseClassLearningController::class, 'recordAttendance'])->name('classes.attendance.store');

        Route::get('/classes', [CourseClassController::class, 'index'])->name('classes.index');
        Route::post('/classes', [CourseClassController::class, 'store'])->name('classes.store');
        Route::post('/classes/{courseClass}/participants', [CourseClassController::class, 'addParticipant'])->name('classes.participants.store');
        Route::delete('/classes/{courseClass}/participants/{user}', [CourseClassController::class, 'removeParticipant'])->name('classes.participants.destroy');

        Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
        Route::patch('/users/{user}/status', [UserManagementController::class, 'updateStatus'])->name('users.status');
    });
});

Route::get('/kelas/{courseClass}/jurnal', ClassJournalController::class)
    ->middleware('auth')
    ->name('classes.journal');

Route::get('/kelas/{courseClass}', [CourseClassMeetingController::class, 'page'])
    ->middleware('auth')
    ->name('classes.show');
