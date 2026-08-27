<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FoundationController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'app');

Route::get('/api/bootstrap', FoundationController::class)->name('bootstrap');
Route::post('/login', [AuthController::class, 'login'])->middleware('guest')->name('login');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');
Route::get('/api/dashboard', DashboardController::class)->middleware('auth')->name('dashboard');
