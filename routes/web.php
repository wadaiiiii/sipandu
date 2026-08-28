<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourseClassController;
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

        Route::get('/classes/{courseClass}/meetings', [CourseClassMeetingController::class, 'index'])->name('classes.meetings.index');
        Route::patch('/classes/{courseClass}/meetings/{meeting}', [CourseClassMeetingController::class, 'update'])->name('classes.meetings.update');

        Route::get('/classes', [CourseClassController::class, 'index'])->name('classes.index');
        Route::post('/classes', [CourseClassController::class, 'store'])->name('classes.store');
        Route::post('/classes/{courseClass}/participants', [CourseClassController::class, 'addParticipant'])->name('classes.participants.store');
        Route::delete('/classes/{courseClass}/participants/{user}', [CourseClassController::class, 'removeParticipant'])->name('classes.participants.destroy');

        Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
        Route::patch('/users/{user}/status', [UserManagementController::class, 'updateStatus'])->name('users.status');
    });
});

Route::get('/kelas/{courseClass}', [CourseClassMeetingController::class, 'page'])
    ->middleware('auth')
    ->name('classes.show');
