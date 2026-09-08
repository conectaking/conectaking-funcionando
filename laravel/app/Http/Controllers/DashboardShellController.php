<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardShellController extends Controller
{
    public function login()
    {
        return $this->shell('login.html');
    }

    public function dashboard()
    {
        return $this->shell('dashboard.html');
    }

    private function shell(string $file)
    {
        $path = public_path('shell/'.$file);
        if (! is_file($path)) {
            return response('Shell não encontrado.', 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response((string) file_get_contents($path), 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('X-Conecta-Engine', 'laravel');
    }
}
