<?php

namespace KingSelection\Http\Controllers\Client;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
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

        $selectionCount = KingSelection::where('gallery_id', $gallery->id)->count();
        $photographerName = $gallery->nome_projeto;
        try {
            $row = DB::table('king_galleries')
                ->join('profile_items', 'profile_items.id', '=', 'king_galleries.profile_item_id')
                ->leftJoin('user_profiles', 'user_profiles.user_id', '=', 'profile_items.user_id')
                ->where('king_galleries.id', $gallery->id)
                ->selectRaw('COALESCE(user_profiles.display_name, king_galleries.nome_projeto) as name')
                ->first();
            if ($row && !empty($row->name)) {
                $photographerName = trim($row->name);
            }
        } catch (\Throwable $e) {
            // Tabelas do app principal podem não existir neste ambiente
        }

        $thankYouTitle = $gallery->thank_you_title ?? 'Obrigado!';
        $thankYouMessage = $gallery->thank_you_message ?? null;
        $thankYouImageUrl = $gallery->thank_you_image_url ?? null;
        $thankYouMessageResolved = $thankYouMessage
            ? str_replace(['{{nome}}', '{{quantidade}}'], [$photographerName, (string) $selectionCount], $thankYouMessage)
            : 'Obrigado por selecionar as fotos do ' . $photographerName . '. Sua seleção de ' . $selectionCount . ' foto(s) foi enviada com sucesso. O fotógrafo entrará em contato.';

        return view('client.success', compact('gallery', 'selectionCount', 'photographerName', 'thankYouTitle', 'thankYouMessageResolved', 'thankYouImageUrl'));
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

