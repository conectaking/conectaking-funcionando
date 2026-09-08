<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\GuestListCustomizeService;
use Illuminate\Http\Request;

class GuestListCustomizeController extends Controller
{
    public function __construct(private readonly GuestListCustomizeService $service)
    {
    }

    public function showPortaria(Request $request, string $id)
    {
        return $this->show($request, $id, 'portaria');
    }

    public function savePortaria(Request $request, string $id)
    {
        return $this->save($request, $id, 'portaria');
    }

    public function showConfirmacao(Request $request, string $id)
    {
        return $this->show($request, $id, 'confirmacao');
    }

    public function saveConfirmacao(Request $request, string $id)
    {
        return $this->save($request, $id, 'confirmacao');
    }

    public function showInscricao(Request $request, string $id)
    {
        return $this->show($request, $id, 'inscricao');
    }

    public function saveInscricao(Request $request, string $id)
    {
        return $this->save($request, $id, 'inscricao');
    }

    private function show(Request $request, string $id, string $kind)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $result = $this->service->page($kind, $userId, $id);
        if (($result['status'] ?? 500) !== 200) {
            return response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erro</title></head><body style="font-family:sans-serif;background:#0D0D0F;color:#ECECEC;text-align:center;padding:3rem;"><h1>'.e($result['message'] ?? 'Erro').'</h1></body></html>',
                $result['status'] ?? 404
            )->header('X-Conecta-Engine', 'laravel');
        }

        $data = $result['data'];
        $data['token'] = $request->query('token') ?: $request->cookie('token') ?: '';

        return response()
            ->view($result['view'], $data)
            ->header('X-Conecta-Engine', 'laravel');
    }

    private function save(Request $request, string $id, string $kind)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $result = $this->service->save($kind, $userId, $id, $request->all());

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }
}
