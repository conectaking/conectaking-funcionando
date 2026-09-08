<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Services\Finance\FinanceService;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function __construct(private readonly FinanceService $finance)
    {
    }

    public function profiles(Request $request)
    {
        $r = $this->finance->profiles((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function primaryProfile(Request $request)
    {
        $r = $this->finance->primaryProfile((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createProfile(Request $request)
    {
        $r = $this->finance->createProfile((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateProfile(Request $request, string $id)
    {
        $r = $this->finance->updateProfile((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteProfile(Request $request, string $id)
    {
        $r = $this->finance->deleteProfile((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function profilesLimit(Request $request)
    {
        $r = $this->finance->profilesLimit((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function incomeBreakdown(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->incomeBreakdown(
            (string) $request->attributes->get('auth_user_id'),
            $request->query('dateFrom') ? (string) $request->query('dateFrom') : null,
            $request->query('dateTo') ? (string) $request->query('dateTo') : null,
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null,
            (string) ($request->query('scope') ?: 'monthly')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function dashboard(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->dashboard(
            (string) $request->attributes->get('auth_user_id'),
            $request->query('dateFrom') ? (string) $request->query('dateFrom') : null,
            $request->query('dateTo') ? (string) $request->query('dateTo') : null,
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function cards(Request $request)
    {
        $r = $this->finance->cards((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createCard(Request $request)
    {
        $r = $this->finance->createCard((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateCard(Request $request, string $id)
    {
        $r = $this->finance->updateCard((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteCard(Request $request, string $id)
    {
        $r = $this->finance->deleteCard((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function transactions(Request $request)
    {
        $r = $this->finance->transactions((string) $request->attributes->get('auth_user_id'), $request->query());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function transactionById(Request $request, string $id)
    {
        $r = $this->finance->transactionById((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createTransaction(Request $request)
    {
        $r = $this->finance->createTransaction((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateTransaction(Request $request, string $id)
    {
        $r = $this->finance->updateTransaction((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteTransaction(Request $request, string $id)
    {
        $r = $this->finance->deleteTransaction((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function categories(Request $request)
    {
        $type = $request->query('type');
        $r = $this->finance->categories(
            (string) $request->attributes->get('auth_user_id'),
            $type ? (string) $type : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createCategory(Request $request)
    {
        $r = $this->finance->createCategory((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function accounts(Request $request)
    {
        $r = $this->finance->accounts((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createAccount(Request $request)
    {
        $r = $this->finance->createAccount((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function goals(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->goals(
            (string) $request->attributes->get('auth_user_id'),
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createGoal(Request $request)
    {
        $r = $this->finance->createGoal((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteGoal(Request $request, string $id)
    {
        $r = $this->finance->deleteGoal((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function kingData(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->kingData(
            (string) $request->attributes->get('auth_user_id'),
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function saveKingData(Request $request)
    {
        $r = $this->finance->saveKingData((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function upgradePlans(Request $request)
    {
        $r = $this->finance->upgradePlans((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function whatsappConfig(Request $request)
    {
        $r = $this->finance->whatsappConfig((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateWhatsappConfig(Request $request)
    {
        $r = $this->finance->updateWhatsappConfig((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function zerarSenhaStatus(Request $request)
    {
        $r = $this->finance->zerarSenhaStatus((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function zerarSenhaVerify(Request $request)
    {
        $r = $this->finance->zerarSenhaVerify((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function putZerarSenha(Request $request)
    {
        $r = $this->finance->putZerarSenha((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function zerarMes(Request $request)
    {
        $r = $this->finance->zerarMes((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function adminClientesSenhas(Request $request)
    {
        $r = $this->finance->adminClientesSenhas((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
