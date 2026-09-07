<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\VcardService;

class VcardController extends Controller
{
    public function __construct(private readonly VcardService $vcard)
    {
    }

    public function show(string $identifier)
    {
        $result = $this->vcard->build($identifier);
        if (!$result) {
            return response('Perfil não encontrado.', 404)->header('X-Conecta-Engine', 'laravel');
        }

        $fileName = strtolower(str_replace(' ', '_', $result['fullName'])).'.vcf';

        return response($result['vCard'], 200, [
            'Content-Type' => 'text/vcard; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            'X-Conecta-Engine' => 'laravel',
        ]);
    }
}
