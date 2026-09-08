<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\GuestListPublicService;
use Illuminate\Http\Request;

class GuestListPublicController extends Controller
{
    public function __construct(private readonly GuestListPublicService $guests)
    {
    }

    public function registerPage(string $token)
    {
        $result = $this->guests->registerPage($token);
        if (($result['status'] ?? 500) !== 200) {
            return response('<h1>'.e($result['message'] ?? 'Não encontrado').'</h1>', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view($result['view'], $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function registerSubmit(Request $request, string $token)
    {
        $result = $this->guests->registerSubmit($token, $request->all());

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function confirmPage(string $identifier)
    {
        $result = $this->guests->confirmPage($identifier);
        if (($result['status'] ?? 500) !== 200) {
            return response('<h1>'.e($result['message'] ?? 'Não encontrado').'</h1>', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view($result['view'], $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function confirmSubmit(Request $request, string $token)
    {
        $result = $this->guests->confirmSubmit($token, $request->all());

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function portariaPage(string $token)
    {
        $result = $this->guests->portariaPage($token);
        if (($result['status'] ?? 500) !== 200) {
            return response('<h1>'.e($result['message'] ?? 'Não encontrado').'</h1>', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view($result['view'], $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function portariaCheckin(string $token, string $guestId)
    {
        $result = $this->guests->portariaCheckin($token, $guestId);

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function verifyQr(string $qrToken)
    {
        $result = $this->guests->verifyQr($qrToken);

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function confirmQr(string $qrToken)
    {
        $result = $this->guests->confirmQr($qrToken);

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function confirmBySearch(Request $request)
    {
        $result = $this->guests->confirmBySearch($request->all());

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }
}
