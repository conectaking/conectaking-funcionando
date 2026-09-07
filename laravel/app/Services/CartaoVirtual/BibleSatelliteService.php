<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;

class BibleSatelliteService
{
    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function hub(string $slug): array
    {
        $user = DB::selectOne(
            'SELECT id, profile_slug FROM users WHERE LOWER(profile_slug) = LOWER(?) LIMIT 1',
            [$slug]
        );
        if (!$user) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }
        $item = DB::selectOne(
            "SELECT pi.id, bi.translation_code
             FROM profile_items pi
             LEFT JOIN bible_items bi ON bi.profile_item_id = pi.id
             WHERE pi.user_id = ? AND pi.item_type = 'bible' AND pi.is_active = true
             LIMIT 1",
            [$user->id]
        );
        if (!$item) {
            return ['status' => 404, 'message' => 'Este perfil não possui o módulo Bíblia ativo.'];
        }

        $verse = app(VerseOfDayService::class)->get();

        return [
            'status' => 200,
            'data' => [
                'slug' => $user->profile_slug,
                'translation' => $item->translation_code ?: 'nvi',
                'verse' => $verse,
                'profileUrl' => '/'.$user->profile_slug,
            ],
        ];
    }
}
