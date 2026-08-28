<?php

namespace App\Http\Controllers;

use App\Services\Classroom\DemoCycleSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardWithDemoController extends Controller
{
    public function __invoke(
        Request $request,
        DemoCycleSeeder $demoCycleSeeder,
        DashboardController $dashboard,
    ): JsonResponse {
        $demoCycleSeeder->seedIfNeeded($request->user());

        return $dashboard($request);
    }
}
