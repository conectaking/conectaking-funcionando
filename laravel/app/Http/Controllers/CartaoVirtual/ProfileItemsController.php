<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\ProfileItemsService;
use Illuminate\Http\Request;

class ProfileItemsController extends Controller
{
    public function __construct(private readonly ProfileItemsService $service)
    {
    }

    public function index(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $items = $this->service->list($userId);

        return response()->json($items)
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function show(Request $request, string $id)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $result = $this->service->getById($userId, $id);

        return response()->json($result['body'], $result['status'])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function store(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $result = $this->service->create($userId, $request->all());

        return response()->json($result['body'], $result['status'])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function update(Request $request, string $id)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $result = $this->service->update($userId, $id, $request->all());

        return response()->json($result['body'], $result['status'])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function destroy(Request $request, string $id)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $result = $this->service->delete($userId, $id);

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }
}
