<?php

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;
use App\Services\Analytics\AnalyticsService;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics)
    {
    }

    public function kpis(Request $request)
    {
        $r = $this->analytics->kpis((string) $request->attributes->get('auth_user_id'), $request->query('period'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function performance(Request $request)
    {
        $r = $this->analytics->performance((string) $request->attributes->get('auth_user_id'), $request->query('period'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function topItems(Request $request)
    {
        $r = $this->analytics->topItems((string) $request->attributes->get('auth_user_id'), $request->query('period'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function details(Request $request)
    {
        $r = $this->analytics->details((string) $request->attributes->get('auth_user_id'), $request->query('period'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
