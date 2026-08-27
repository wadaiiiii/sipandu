<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourseClassController;
use App\Http\Controllers\CourseClassMeetingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FoundationController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'app');
Route::get('/pengguna', [UserManagementController::class, 'page'])->name('users.page');

Route::get('/api/bootstrap', FoundationController::class)->name('bootstrap');
Route::post('/login', [AuthController::class, 'login'])->middleware('guest')->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

Route::middleware('auth')->group(function (): void {
    Route::get('/api/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/kelas/{courseClass}', [CourseClassMeetingController::class, 'page'])->name('classes.show');
    Route::get('/api/classes/{courseClass}/meetings', [CourseClassMeetingController::class, 'index'])->name('classes.meetings.index');
    Route::patch('/api/classes/{courseClass}/meetings/{meeting}', [CourseClassMeetingController::class, 'update'])->name('classes.meetings.update');

    Route::get('/api/classes', [CourseClassController::class, 'index'])->name('classes.index');
    Route::post('/api/classes', [CourseClassController::class, 'store'])->name('classes.store');
    Route::post('/api/classes/{courseClass}/participants', [CourseClassController::class, 'addParticipant'])->name('classes.participants.store');
    Route::delete('/api/classes/{courseClass}/participants/{user}', [CourseClassController::class, 'removeParticipant'])->name('classes.participants.destroy');

    Route::get('/api/users', [UserManagementController::class, 'index'])->name('users.index');
    Route::post('/api/users', [UserManagementController::class, 'store'])->name('users.store');
    Route::patch('/api/users/{user}/status', [UserManagementController::class, 'updateStatus'])->name('users.status');
});
