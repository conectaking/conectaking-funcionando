<?php

namespace KingSelection\Http\Controllers\Client;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use KingSelection\Models\KingGallery;
use KingSelection\Models\KingSelection;

class ClientGalleryController extends Controller
{
    public function gallery(Request $request, string $slug)
    {
        $gallery = KingGallery::where('slug', $slug)->firstOrFail();
        $gallery->load(['photos']);

        $selectedIds = KingSelection::where('gallery_id', $gallery->id)->pluck('photo_id')->all();

        return view('client.gallery', [
            'gallery' => $gallery,
            'selectedIds' => $selectedIds
        ]);
    }

    public function toggleSelection(Request $request, string $slug)
    {
        $gallery = KingGallery::where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'photo_id' => ['required', 'integer']
        ]);

        $photoId = (int) $data['photo_id'];

        $existing = KingSelection::where('gallery_id', $gallery->id)->where('photo_id', $photoId)->first();
        if ($existing) {
            $existing->delete();
            return response()->json(['selected' => false]);
        }

        KingSelection::create([
            'gallery_id' => $gallery->id,
            'photo_id' => $photoId,
            'feedback_cliente' => null
        ]);

        return response()->json(['selected' => true]);
    }

    public function finalize(Request $request, string $slug)
    {
        $gallery = KingGallery::where('slug', $slug)->firstOrFail();
        $data = $request->validate([
            'feedback' => ['nullable', 'string', 'max:2000']
        ]);

        if (!empty($data['feedback'])) {
            // Salvar feedback em todas as seleções como referência simples
            KingSelection::where('gallery_id', $gallery->id)->update([
                'feedback_cliente' => $data['feedback']
            ]);
        }

        return view('client.success', compact('gallery'));
    }

    public function export(Request $request, string $slug)
    {
        $gallery = KingGallery::where('slug', $slug)->firstOrFail();
        $selections = KingSelection::where('gallery_id', $gallery->id)->with('photo')->get();

        $names = $selections->map(function ($s) {
            return $s->photo?->original_name;
        })->filter()->values()->all();

        $lightroom = implode(', ', $names);
        $windows = implode(' OR ', array_map(function ($n) {
            return '"' . str_replace('"', '', $n) . '"';
        }, $names));

        return view('client.export', compact('gallery', 'lightroom', 'windows'));
    }
}

