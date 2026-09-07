<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\ProfileDigitalFormService;
use App\Services\CartaoVirtual\ProfileTypedItemsService;
use Illuminate\Http\Request;

class ProfileTypedItemsController extends Controller
{
    public function __construct(
        private readonly ProfileTypedItemsService $typed,
        private readonly ProfileDigitalFormService $digitalForm,
    ) {
    }

    public function updateBanner(Request $request, string $id)
    {
        return $this->respond($this->typed->updateBanner(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            $request->all()
        ));
    }

    public function updateLink(Request $request, string $id)
    {
        return $this->respond($this->typed->updateLink(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            $request->all()
        ));
    }

    public function updateCarousel(Request $request, string $id)
    {
        return $this->respond($this->typed->updateCarousel(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            $request->all()
        ));
    }

    public function updatePix(Request $request, string $id)
    {
        return $this->respond($this->typed->updatePix(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            $request->all()
        ));
    }

    public function updatePdf(Request $request, string $id)
    {
        return $this->respond($this->typed->updatePdf(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            $request->all()
        ));
    }

    public function updateDigitalForm(Request $request, string $id)
    {
        return $this->respond($this->digitalForm->update(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            $request->all()
        ));
    }

    public function duplicate(Request $request, string $id)
    {
        return $this->respond($this->typed->duplicate(
            (string) $request->attributes->get('auth_user_id', ''),
            $id
        ));
    }

    /**
     * @param  array{status:int, body:array<string, mixed>}  $result
     */
    private function respond(array $result)
    {
        return response()->json($result['body'], $result['status'])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0')
            ->header('X-Conecta-Engine', 'laravel');
    }
}
