<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Services\Account\LinkLimitsService;
use Illuminate\Http\Request;

class LinkLimitsController extends Controller
{
    public function __construct(private readonly LinkLimitsService $limits)
    {
    }

    public function user(Request $request)
    {
        $data = $this->limits->getUserLinkLimits((string) $request->attributes->get('auth_user_id'));

        return response()->json(['success' => true, 'data' => $data])->header('X-Conecta-Engine', 'laravel');
    }

    public function check(Request $request, string $moduleType)
    {
        $r = $this->limits->checkLimit((string) $request->attributes->get('auth_user_id'), $moduleType);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function index(Request $request)
    {
        $r = $this->limits->index((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function upsert(Request $request)
    {
        $r = $this->limits->upsert((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function bulkUpdate(Request $request)
    {
        $r = $this->limits->bulkUpdate((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function resetPlan(Request $request)
    {
        $r = $this->limits->resetPlan((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function copyPlan(Request $request)
    {
        $r = $this->limits->copyPlan((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function stats(Request $request)
    {
        $r = $this->limits->stats((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
