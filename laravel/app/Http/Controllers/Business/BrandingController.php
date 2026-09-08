<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Services\Business\BrandingService;
use Illuminate\Http\Request;

class BrandingController extends Controller
{
    public function __construct(private readonly BrandingService $branding)
    {
    }

    public function update(Request $request)
    {
        $r = $this->branding->save((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
