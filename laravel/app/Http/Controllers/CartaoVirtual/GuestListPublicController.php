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
}
