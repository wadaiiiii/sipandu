<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourseClassController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FoundationController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'app');

Route::get('/api/bootstrap', FoundationController::class)->name('bootstrap');
Route::post('/login', [AuthController::class, 'login'])->middleware('guest')->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

Route::middleware('auth')->group(function (): void {
    Route::get('/api/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/api/classes', [CourseClassController::class, 'index'])->name('classes.index');
    Route::post('/api/classes', [CourseClassController::class, 'store'])->name('classes.store');
    Route::post('/api/classes/{courseClass}/participants', [CourseClassController::class, 'addParticipant'])->name('classes.participants.store');
    Route::delete('/api/classes/{courseClass}/participants/{user}', [CourseClassController::class, 'removeParticipant'])->name('classes.participants.destroy');
});
