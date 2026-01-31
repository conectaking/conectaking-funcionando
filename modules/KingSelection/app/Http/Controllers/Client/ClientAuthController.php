<?php

namespace KingSelection\Http\Controllers\Client;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use KingSelection\Models\KingGallery;

class ClientAuthController extends Controller
{
    public function landing(Request $request, string $slug)
    {
        $gallery = KingGallery::where('slug', $slug)->firstOrFail();
        return view('client.landing', compact('gallery'));
    }

    public function login(Request $request, string $slug)
    {
        $gallery = KingGallery::where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'email' => ['required', 'email'],
            'senha' => ['required', 'string']
        ]);

        $email = strtolower(trim($data['email']));
        if ($email !== strtolower($gallery->cliente_email)) {
            return back()->withErrors(['email' => 'E-mail não confere para esta galeria.'])->withInput();
        }

        if (!password_verify($data['senha'], $gallery->senha_hash)) {
            return back()->withErrors(['senha' => 'Senha inválida.'])->withInput();
        }

        $request->session()->put('kingselection.gallery.' . $slug . '.authed', true);
        $request->session()->put('kingselection.gallery.' . $slug . '.gallery_id', (int) $gallery->id);

        return redirect('/g/' . $slug . '/gallery');
    }

    public function logout(Request $request, string $slug)
    {
        $request->session()->forget('kingselection.gallery.' . $slug . '.authed');
        $request->session()->forget('kingselection.gallery.' . $slug . '.gallery_id');
        return redirect('/g/' . $slug);
    }
}

