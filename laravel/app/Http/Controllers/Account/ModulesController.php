<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Services\Account\ModulesService;
use Illuminate\Http\Request;

class ModulesController extends Controller
{
    public function __construct(private readonly ModulesService $modules)
    {
    }

    public function available(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $plan = $request->query('plan_code');
        $r = $this->modules->available($userId, $plan !== null && $plan !== '' ? (string) $plan : null);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function planAvailability()
    {
        $r = $this->modules->planAvailability();

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function planAvailabilityPublic()
    {
        $r = $this->modules->planAvailabilityPublic();

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updatePlanAvailability(Request $request)
    {
        $r = $this->modules->updatePlanAvailability($request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
