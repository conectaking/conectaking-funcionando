<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Services\Account\SubscriptionService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(private readonly SubscriptionService $subs)
    {
    }

    public function info(Request $request)
    {
        $r = $this->subs->info((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function plans(Request $request)
    {
        $r = $this->subs->plansForAdmin((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updatePlan(Request $request, string $id)
    {
        $r = $this->subs->updatePlan(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function plansPublic()
    {
        $r = $this->subs->plansPublic();

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
