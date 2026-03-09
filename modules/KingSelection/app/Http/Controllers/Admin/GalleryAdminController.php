<?php

namespace KingSelection\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;
use KingSelection\Models\KingGallery;

class GalleryAdminController extends Controller
{
    public function index(Request $request)
    {
        $galleries = KingGallery::orderByDesc('id')->get();
        return view('admin.galleries.index', compact('galleries'));
    }

    public function create()
    {
        return view('admin.galleries.create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nome_projeto' => ['required', 'string', 'max:255'],
            'cliente_email' => ['required', 'email', 'max:255'],
            'senha' => ['required', 'string', 'min:6'],
            'total_fotos_contratadas' => ['nullable', 'integer', 'min:0']
        ]);

        $slug = Str::slug($data['nome_projeto']) ?: ('galeria-' . time());

        // Garantir unicidade simples
        $base = $slug;
        $i = 2;
        while (KingGallery::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i;
            $i++;
        }

        $gallery = KingGallery::create([
            'profile_item_id' => (int) ($request->query('profileItemId') ?? 0),
            'nome_projeto' => $data['nome_projeto'],
            'slug' => $slug,
            'cliente_email' => strtolower($data['cliente_email']),
            'senha_hash' => password_hash($data['senha'], PASSWORD_BCRYPT),
            'status' => 'preparacao',
            'total_fotos_contratadas' => (int) ($data['total_fotos_contratadas'] ?? 0)
        ]);

        return redirect('/admin/galleries/' . $gallery->id);
    }

    public function show(KingGallery $gallery)
    {
        $gallery->load(['photos', 'selections']);
        return view('admin.galleries.show', compact('gallery'));
    }

    public function updateStatus(Request $request, KingGallery $gallery)
    {
        $data = $request->validate([
            'status' => ['required', 'in:preparacao,andamento,revisao,finalizado']
        ]);
        $gallery->status = $data['status'];
        $gallery->save();
        return back();
    }
}

