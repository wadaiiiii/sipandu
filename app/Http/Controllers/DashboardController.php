<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseClass;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'courses' => Course::query()->count(),
            'classes' => CourseClass::query()->count(),
            'message' => 'Fondasi SiPANDU aktif. Modul kelas, pembelajaran, asesmen, dan OBE akan dibangun di atas domain ini.',
        ]);
    }
}
