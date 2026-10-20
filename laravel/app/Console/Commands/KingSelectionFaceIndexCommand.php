<?php

namespace App\Console\Commands;

use App\Services\CartaoVirtual\KingSelectionFaceService;
use App\Services\CartaoVirtual\KingSelectionMediaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KingSelectionFaceIndexCommand extends Command
{
    protected $signature = 'ks:face-index {galleryId : ID da galeria para indexar} {--force : Reindexar fotos já processadas} {--limit=0 : Limite de fotos para processar (0 = todas)}';

    protected $description = 'Indexa rostos de uma galeria usando a IA local própria (YuNet + SFace)';

    public function handle(KingSelectionMediaService $media, KingSelectionFaceService $faceService): int
    {
        $galleryId = (int) $this->argument('galleryId');
        $force = (bool) $this->option('force');
        $limit = (int) $this->option('limit');

        $aiUrl = env('FACE_AI_URL') ?: 'http://conectaking-face-ai:5005';
        $this->info("Verificando ConectaKing Face AI em: {$aiUrl}");

        try {
            $health = Http::timeout(3)->get("{$aiUrl}/health");
            if (! $health->successful()) {
                $this->error("Face AI offline ou inacessível em {$aiUrl} (status: " . $health->status() . ")");
                return 1;
            }
            $this->info("Face AI online: " . json_encode($health->json()));
        } catch (\Throwable $e) {
            $this->error("Falha ao conectar com Face AI: " . $e->getMessage());
            return 1;
        }

        $query = DB::table('king_photos')
            ->where('gallery_id', $galleryId)
            ->orderBy('id', 'asc');

        if (! $force) {
            $query->whereNotExists(function ($sub) {
                $sub->select(DB::raw(1))
                    ->from('rekognition_photo_faces')
                    ->whereColumn('rekognition_photo_faces.photo_id', 'king_photos.id');
            });
        }

        if ($limit > 0) {
            $query->limit($limit);
        }

        $photos = $query->get(['id', 'file_path', 'original_name']);
        $total = $photos->count();

        if ($total === 0) {
            $this->info("Nenhuma foto pendente de indexação para a galeria #{$galleryId}. (Use --force para reprocessar)");
            return 0;
        }

        $this->info("Iniciando indexação local de {$total} foto(s) para a galeria #{$galleryId}...");

        // Clientes matriculados para matching imediato
        $clients = DB::table('rekognition_client_faces')
            ->where('gallery_id', $galleryId)
            ->whereNotNull('embedding')
            ->get(['client_id', 'embedding']);

        $clientEmbeddings = [];
        foreach ($clients as $c) {
            $arr = json_decode($c->embedding, true);
            if (is_array($arr) && in_array(count($arr), [128, 512], true)) {
                $clientEmbeddings[(int) $c->client_id] = $arr;
            }
        }
        $this->info("Clientes matriculados com rosto nesta galeria: " . count($clientEmbeddings));

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $processed = 0;
        $totalFacesDetected = 0;
        $totalMatchesFound = 0;

        foreach ($photos as $photo) {
            try {
                $buf = $media->bufferFromStoragePath($photo->file_path);
                if (! $buf) {
                    $bar->advance();
                    continue;
                }

                // Normaliza imagem (máx 1280px para agilidade e precisão)
                $res = Http::timeout(20)
                    ->withBody($buf, 'image/jpeg')
                    ->post("{$aiUrl}/extract");

                if (! $res->successful()) {
                    $bar->advance();
                    continue;
                }

                $faces = $res->json('faces') ?? [];

                if ($force) {
                    DB::table('rekognition_photo_faces')->where('photo_id', $photo->id)->delete();
                }

                $insertedFaceIds = [];
                foreach ($faces as $idx => $f) {
                    $box = $f['box'] ?? [0, 0, 0, 0];
                    $conf = (float) ($f['confidence'] ?? 0);
                    $emb = $f['embedding'] ?? [];

                    $pfId = DB::table('rekognition_photo_faces')->insertGetId([
                        'photo_id' => $photo->id,
                        'face_index' => (int) $idx,
                        'bounding_box_json' => json_encode($box),
                        'confidence' => round($conf * 100, 2),
                        'embedding' => json_encode($emb),
                        'created_at' => now(),
                    ]);

                    $totalFacesDetected++;
                    if (! empty($emb)) {
                        $insertedFaceIds[] = [
                            'id' => (int) $pfId,
                            'photo_id' => (int) $photo->id,
                            'embedding' => $emb,
                        ];
                    }
                }

                // Match imediato contra clientes já cadastrados
                if (! empty($insertedFaceIds) && ! empty($clientEmbeddings)) {
                    foreach ($clientEmbeddings as $cid => $cEmb) {
                        $mRes = Http::timeout(5)->post("{$aiUrl}/match", [
                            'query_embedding' => $cEmb,
                            'targets' => $insertedFaceIds,
                            'threshold' => (float) (env('FACE_AI_THRESHOLD') ?: 0.55),
                        ]);
                        if ($mRes->successful()) {
                            $matches = $mRes->json('matches') ?? [];
                            foreach ($matches as $m) {
                                DB::table('rekognition_face_matches')->updateOrInsert(
                                    ['photo_face_id' => $m['id'], 'client_id' => $cid],
                                    [
                                        'similarity' => $m['similarity'],
                                        'rekognition_face_id' => 'local_' . $photo->id,
                                        'created_at' => now(),
                                    ]
                                );
                                $totalMatchesFound++;
                            }
                        }
                    }
                }

                if (\App\Support\SchemaMeta::hasTable('rekognition_photo_jobs')) {
                    DB::table('rekognition_photo_jobs')->updateOrInsert(
                        ['gallery_id' => $galleryId, 'photo_id' => $photo->id],
                        [
                            'r2_key' => (string) ($photo->file_path ?? ''),
                            'process_status' => 'done',
                            'processed_at' => now(),
                        ]
                    );
                }

                $processed++;
            } catch (\Throwable $e) {
                Log::warning('ks.face.indexCommand.photoFailed', [
                    'photoId' => $photo->id,
                    'error' => $e->getMessage(),
                ]);
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info("Indexação concluída!");
        $this->line("- Fotos processadas com sucesso: {$processed} / {$total}");
        $this->line("- Rostos detectados: {$totalFacesDetected}");
        $this->line("- Matches com clientes encontrados: {$totalMatchesFound}");

        return 0;
    }
}
