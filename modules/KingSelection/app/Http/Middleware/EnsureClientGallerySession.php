<?php

namespace KingSelection\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClientGallerySession
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = $request->route('slug');
        $sessionKey = 'kingselection.gallery.' . $slug . '.authed';
        if (!$request->session()->get($sessionKey, false)) {
            return redirect('/g/' . $slug);
        }
        return $next($request);
    }
}

