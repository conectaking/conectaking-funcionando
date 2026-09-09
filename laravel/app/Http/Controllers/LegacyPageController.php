<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

/**
 * Ponte entre o front legado e o Blade: se existir `pages.{nome}` renderiza Blade,
 * senão cai no HTML de public/ ou public_html/ (FrontLegacyController).
 *
 * Permite converter as páginas uma a uma sem tocar nas rotas.
 */
class LegacyPageController extends Controller
{
    public function show(Request $request, string $name)
    {
        $name = trim(str_replace('\\', '/', $name), '/');
        $name = preg_replace('/\.html?$/i', '', $name) ?? '';

        if ($name !== '' && preg_match('/^[A-Za-z0-9_-]+$/', $name) === 1) {
            $view = 'pages.'.$name;
            if (View::exists($view)) {
                return response(View::make($view)->render(), 200)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    ->header('X-Conecta-Engine', 'laravel');
            }
        }

        return app(FrontLegacyController::class)->page($request, $name);
    }
}
