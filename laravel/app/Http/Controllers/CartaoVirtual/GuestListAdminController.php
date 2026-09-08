<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\GuestListAdminService;
use Illuminate\Http\Request;

class GuestListAdminController extends Controller
{
    public function __construct(private readonly GuestListAdminService $admin)
    {
    }

    public function index(Request $request)
    {
        $r = $this->admin->index((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function store(Request $request)
    {
        $r = $this->admin->store((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function show(Request $request, string $id)
    {
        $r = $this->admin->show((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function update(Request $request, string $id)
    {
        $r = $this->admin->update((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());
        if ($r['status'] === 200 && is_array($r['body'])) {
            $data = $r['body'];
            $data['guest_list_data'] = $r['body'];
            $r['body'] = $data;
        }

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function destroy(Request $request, string $id)
    {
        $r = $this->admin->destroy((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function guests(Request $request, string $id)
    {
        $r = $this->admin->guests(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->query()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function storeGuest(Request $request, string $id)
    {
        $r = $this->admin->storeGuest((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateGuest(Request $request, string $id, string $guestId)
    {
        $r = $this->admin->updateGuest(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $guestId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function destroyGuest(Request $request, string $id, string $guestId)
    {
        $r = $this->admin->destroyGuest(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $guestId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function destroyAllGuests(Request $request, string $id)
    {
        $r = $this->admin->destroyAllGuests((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function generateQr(Request $request, string $id, string $guestId)
    {
        $r = $this->admin->generateQr(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $guestId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function generateAllQr(Request $request, string $id)
    {
        $r = $this->admin->generateAllQr((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function resetTokens(Request $request, string $id)
    {
        $r = $this->admin->resetTokens((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function stats(Request $request, string $id)
    {
        $r = $this->admin->stats((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function exportPdf(Request $request, string $id)
    {
        $r = $this->admin->exportPdf(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->query()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
