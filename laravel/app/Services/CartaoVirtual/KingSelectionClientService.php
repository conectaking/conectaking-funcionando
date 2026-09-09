<?php

namespace App\Services\CartaoVirtual;

use App\Services\Auth\JwtService;
use App\Support\KingSelection\KsAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * King Selection — auth + galeria cliente (fatia inicial sem face/vendas).
 */
class KingSelectionClientService
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly KingSelectionPublicService $public,
        private readonly KingSelectionMediaService $media,
        private readonly KingSelectionPasswordCrypto $passwordCrypto,
        private readonly KingSelectionSelectionService $selection,
    ) {
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function login(string $slug, string $email, string $senha): array
    {
        $slug = trim($slug);
        $emailNorm = strtolower(trim($email));
        if ($slug === '' || $emailNorm === '' || $senha === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe slug, email e senha.']];
        }

        $g = DB::selectOne(
            'SELECT id, slug, cliente_email, senha_hash FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
            [$slug]
        );
        if (!$g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        try {
            $c = DB::selectOne(
                'SELECT id, senha_hash, enabled FROM king_gallery_clients
                 WHERE gallery_id = ? AND lower(email) = lower(?)
                 ORDER BY id ASC LIMIT 1',
                [$g->id, $emailNorm]
            );
        } catch (\Throwable) {
            $c = null;
        }

        if ($c) {
            if (isset($c->enabled) && filter_var($c->enabled, FILTER_VALIDATE_BOOLEAN) === false) {
                return ['status' => 401, 'body' => ['message' => 'Acesso desativado. Solicite um novo acesso ao fotógrafo.']];
            }
            if (!password_verify($senha, (string) ($c->senha_hash ?? ''))) {
                return ['status' => 401, 'body' => ['message' => 'E-mail ou senha inválidos.']];
            }
            $token = $this->jwt->encode([
                'type' => 'kingselection_client',
                'galleryId' => (int) $g->id,
                'slug' => (string) $g->slug,
                'clientId' => (int) $c->id,
                'tyh' => false,
            ], '14d');

            return ['status' => 200, 'body' => ['success' => true, 'token' => $token]];
        }

        $legacyEmail = strtolower(trim((string) ($g->cliente_email ?? '')));
        if ($legacyEmail === '' || $emailNorm !== $legacyEmail) {
            return ['status' => 401, 'body' => ['message' => 'E-mail ou senha inválidos.']];
        }
        if (!password_verify($senha, (string) ($g->senha_hash ?? ''))) {
            return ['status' => 401, 'body' => ['message' => 'E-mail ou senha inválidos.']];
        }
        $token = $this->jwt->encode([
            'type' => 'kingselection_client',
            'galleryId' => (int) $g->id,
            'slug' => (string) $g->slug,
            'clientId' => null,
            'tyh' => false,
        ], '14d');

        return ['status' => 200, 'body' => ['success' => true, 'token' => $token]];
    }

    /**
     * Reentrar com nome + e-mail (+ telefone se cadastrado) — sem senha.
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function loginByDetails(string $slug, string $nome, string $email, ?string $telefone): array
    {
        $slug = trim($slug);
        if ($slug === '' || trim($nome) === '' || trim($email) === '') {
            return [
                'status' => 400,
                'body' => [
                    'message' => 'Informe slug, nome e e-mail. O telefone é obrigatório apenas se já estiver salvo no seu cadastro.',
                ],
            ];
        }

        $g = DB::selectOne(
            'SELECT id, slug FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
            [$slug]
        );
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 503, 'body' => ['message' => 'Cadastro de clientes indisponível neste servidor.']];
        }

        $hasAm = Schema::hasColumn('king_galleries', 'access_mode');
        $hasSelf = Schema::hasColumn('king_galleries', 'allow_self_signup');
        $gx = DB::selectOne(
            'SELECT id'
            .($hasAm ? ', access_mode' : '')
            .($hasSelf ? ', allow_self_signup' : '')
            .' FROM king_galleries WHERE id = ? LIMIT 1',
            [$g->id]
        );
        $am = KsAccess::normAccessMode($hasAm ? ($gx->access_mode ?? 'private') : 'private');
        $allow = $hasSelf
            ? filter_var($gx->allow_self_signup ?? false, FILTER_VALIDATE_BOOLEAN)
            : KsAccess::allowsSelfSignup($am);
        $allowDetailsLogin =
            $am === 'public'
            || $am === 'paid_event_photos'
            || (KsAccess::allowsSelfSignup($am) && $allow);
        if (! $allowDetailsLogin) {
            return ['status' => 403, 'body' => ['message' => 'Nesta galeria use e-mail e senha.']];
        }

        $emailNorm = strtolower(trim($email));
        $nomeNorm = KsAccess::normClientNameMatch($nome);
        $telDigits = KsAccess::normClientPhoneDigits($telefone ?? '');

        $c = DB::selectOne(
            'SELECT id, nome, telefone, enabled, status
             FROM king_gallery_clients
             WHERE gallery_id = ? AND lower(email) = lower(?)
             ORDER BY id DESC LIMIT 1',
            [$g->id, $emailNorm]
        );
        if (! $c) {
            return [
                'status' => 401,
                'body' => [
                    'message' => $am === 'public'
                        ? 'Não encontramos cadastro com este e-mail. Use «Criar cadastro e entrar» se for sua primeira vez.'
                        : 'Não encontramos cadastro com este e-mail nesta galeria. Verifique o e-mail ou envie a seleção primeiro; se já enviou, use o mesmo e-mail de antes.',
                ],
            ];
        }

        if (isset($c->enabled) && filter_var($c->enabled, FILTER_VALIDATE_BOOLEAN) === false) {
            return ['status' => 401, 'body' => ['message' => 'Acesso desativado. Solicite um novo acesso ao fotógrafo.']];
        }

        $st = KsAccess::normStatus($c->status ?? '');
        if ($st === 'finalizado' && $am !== 'public') {
            return ['status' => 403, 'body' => ['message' => 'Esta seleção já foi finalizada. Fale com o fotógrafo.']];
        }

        if (KsAccess::normClientNameMatch($c->nome ?? '') !== $nomeNorm) {
            return [
                'status' => 401,
                'body' => [
                    'message' => $am === 'public'
                        ? 'O nome não confere com o cadastro deste e-mail. Use o mesmo nome de quando você se cadastrou.'
                        : 'O nome não confere com o cadastro deste e-mail. Use exatamente o mesmo nome de quando você enviou a seleção.',
                ],
            ];
        }

        $rowTelDigits = KsAccess::normClientPhoneDigits($c->telefone ?? '');
        if (strlen($rowTelDigits) >= 8) {
            if (strlen($telDigits) < 8) {
                return ['status' => 400, 'body' => ['message' => 'Informe o WhatsApp cadastrado (com DDD ou código do país).']];
            }
            if ($telDigits !== $rowTelDigits) {
                return [
                    'status' => 401,
                    'body' => [
                        'message' => $am === 'public'
                            ? 'O WhatsApp não confere com o cadastro deste e-mail. Use o mesmo número de quando você se cadastrou.'
                            : 'O telefone não confere com o cadastro deste e-mail. Use o mesmo número de quando você enviou ou entre com e-mail e senha.',
                    ],
                ];
            }
        } elseif (trim((string) ($telefone ?? '')) !== '' && strlen($telDigits) > 0 && strlen($telDigits) < 8) {
            return [
                'status' => 400,
                'body' => [
                    'message' => 'Telefone incompleto. Deixe em branco se seu cadastro ainda não tinha telefone, ou informe o número completo com DDD.',
                ],
            ];
        }

        $token = $this->jwt->encode([
            'type' => 'kingselection_client',
            'galleryId' => (int) $g->id,
            'slug' => (string) $g->slug,
            'clientId' => (int) $c->id,
            'tyh' => false,
        ], '14d');

        return ['status' => 200, 'body' => ['success' => true, 'token' => $token]];
    }

    /**
     * Autocadastro de cliente (se habilitado na galeria).
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function register(string $slug, string $nome, string $email, ?string $telefone): array
    {
        $slug = trim($slug);
        if ($slug === '' || trim($nome) === '' || trim($email) === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe slug, nome e e-mail.']];
        }

        $g = DB::selectOne(
            'SELECT * FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
            [$slug]
        );
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $hasSelf = Schema::hasColumn('king_galleries', 'allow_self_signup');
        $hasAm = Schema::hasColumn('king_galleries', 'access_mode');
        $accessMode = $hasAm ? KsAccess::normAccessMode($g->access_mode ?? 'private') : 'private';
        $allowRegister =
            ($hasSelf && filter_var($g->allow_self_signup ?? false, FILTER_VALIDATE_BOOLEAN))
            || $accessMode === 'public';

        if (! $allowRegister) {
            return ['status' => 403, 'body' => ['message' => 'Autocadastro desativado nesta galeria.']];
        }

        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 500, 'body' => ['message' => 'Tabela de clientes não disponível (migração pendente).']];
        }

        $pass = (string) random_int(100000, 999999);
        $senhaHash = password_hash($pass, PASSWORD_BCRYPT);
        $emailNorm = strtolower(trim($email));
        $telNorm = trim((string) ($telefone ?? ''));
        $nomeNorm = mb_substr(trim($nome), 0, 255);

        $row = [
            'gallery_id' => (int) $g->id,
            'nome' => $nomeNorm,
            'email' => $emailNorm,
            'telefone' => $telNorm !== '' ? $telNorm : null,
            'senha_hash' => $senhaHash,
            'enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if (Schema::hasColumn('king_gallery_clients', 'senha_enc')) {
            $row['senha_enc'] = $this->passwordCrypto->encrypt($pass);
        }

        try {
            $newId = DB::table('king_gallery_clients')->insertGetId($row);
        } catch (\Throwable $e) {
            $msg = strtolower($e->getMessage());
            if (str_contains($msg, 'uniq_king_gallery_clients_gallery_email') || str_contains($msg, 'unique')) {
                return ['status' => 409, 'body' => ['message' => 'Já existe um cliente com este e-mail nesta galeria.']];
            }
            throw $e;
        }

        $token = $this->jwt->encode([
            'type' => 'kingselection_client',
            'galleryId' => (int) $g->id,
            'slug' => (string) $g->slug,
            'clientId' => (int) $newId,
            'tyh' => false,
        ], '14d');

        $body = ['success' => true, 'token' => $token];
        if ($accessMode !== 'public') {
            $body['client_password'] = $pass;
        }

        return ['status' => 200, 'body' => $body];
    }

    /**
     * Sessão anónima (galeria pública).
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function publicEnter(string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe o slug da galeria.']];
        }

        $hasAm = Schema::hasColumn('king_galleries', 'access_mode');
        $g = DB::selectOne(
            'SELECT id, slug'.($hasAm ? ', access_mode' : '').' FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
            [$slug]
        );
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $accessMode = $hasAm ? KsAccess::normAccessMode($g->access_mode ?? 'private') : 'private';
        if ($accessMode !== 'public') {
            return ['status' => 403, 'body' => ['message' => 'Esta galeria exige login ou cadastro.']];
        }

        $sk = substr(str_replace('-', '', (string) \Illuminate\Support\Str::uuid()), 0, 32);
        $token = $this->jwt->encode([
            'type' => 'kingselection_client',
            'galleryId' => (int) $g->id,
            'slug' => (string) $g->slug,
            'clientId' => null,
            'sk' => $sk,
        ], '14d');

        return ['status' => 200, 'body' => ['success' => true, 'token' => $token]];
    }

    /**
     * Sessão anónima com chave (cadastro ao enviar) — signup + autocadastro.
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function signupEnter(string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe o slug da galeria.']];
        }

        $hasSelf = Schema::hasColumn('king_galleries', 'allow_self_signup');
        $hasAm = Schema::hasColumn('king_galleries', 'access_mode');
        $g = DB::selectOne(
            'SELECT id, slug'
            .($hasSelf ? ', allow_self_signup' : '')
            .($hasAm ? ', access_mode' : '')
            .' FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
            [$slug]
        );
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $accessMode = $hasAm ? KsAccess::normAccessMode($g->access_mode ?? 'private') : 'private';
        $allowSelf = $hasSelf
            ? filter_var($g->allow_self_signup ?? false, FILTER_VALIDATE_BOOLEAN)
            : KsAccess::allowsSelfSignup($accessMode);
        if (! KsAccess::allowsSelfSignup($accessMode) || ! $allowSelf) {
            return ['status' => 403, 'body' => ['message' => 'Esta galeria não usa o fluxo de cadastro ao enviar.']];
        }

        $sk = substr(str_replace('-', '', (string) \Illuminate\Support\Str::uuid()), 0, 32);
        $token = $this->jwt->encode([
            'type' => 'kingselection_client',
            'galleryId' => (int) $g->id,
            'slug' => (string) $g->slug,
            'clientId' => null,
            'sk' => $sk,
        ], '14d');

        return ['status' => 200, 'body' => ['success' => true, 'token' => $token]];
    }

    /**
     * Galeria autenticada — campos essenciais para a SPA (sem face/vendas/promo avançado).
     *
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function clientGallery(array $payload, string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        if ($galleryId < 1) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }

        try {
            $g = DB::selectOne(
                'SELECT id, nome_projeto, slug, status, total_fotos_contratadas,
                        min_selections, allow_download, face_recognition_enabled,
                        access_mode, allow_self_signup, client_folder_layout,
                        client_entry_splash_enabled, gallery_link_cover_photo_id,
                        gallery_link_cover_file_path, tutorial_video_url,
                        thank_you_title, thank_you_message, thank_you_image_url,
                        thank_you_photographer_name
                 FROM king_galleries WHERE id = ? LIMIT 1',
                [$galleryId]
            );
        } catch (\Throwable $e) {
            Log::warning('ks.clientGallery', ['error' => $e->getMessage()]);
            $g = DB::selectOne(
                'SELECT id, nome_projeto, slug, status, total_fotos_contratadas FROM king_galleries WHERE id = ? LIMIT 1',
                [$galleryId]
            );
        }
        if (!$g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $content = $this->public->galleryContent((string) $g->slug);
        $photos = [];
        $folders = [];
        $folderLayout = strtolower(trim((string) ($g->client_folder_layout ?? 'folders'))) === 'flat' ? 'flat' : 'folders';
        if (($content['status'] ?? 0) === 200) {
            $photos = $content['body']['gallery']['photos'] ?? [];
            $folders = $content['body']['gallery']['folders'] ?? [];
            $folderLayout = (string) ($content['body']['gallery']['client_folder_layout'] ?? $folderLayout);
        } else {
            // Galeria não-pública: carregar mídia em chunks (mesma lógica do público).
            $media = $this->public->loadClientMedia($galleryId, $folderLayout);
            $photos = $media['photos'];
            $folders = $media['folders'];
            $folderLayout = $media['folder_layout'];
        }

        $accessMode = KsAccess::normAccessMode($g->access_mode ?? 'private');
        $sel = $this->selection->gallerySelectionState($payload, $g);

        $hasCover = !empty($g->gallery_link_cover_photo_id ?? null) || !empty($g->gallery_link_cover_file_path ?? null);
        $splash = $hasCover || !empty($g->client_entry_splash_enabled ?? false);

        $gallery = [
            'id' => (int) $g->id,
            'nome_projeto' => (string) ($g->nome_projeto ?? ''),
            'slug' => (string) $g->slug,
            'status' => (string) ($g->status ?? 'preparacao'),
            'total_fotos_contratadas' => (int) ($g->total_fotos_contratadas ?? 0),
            'min_selections' => (int) ($g->min_selections ?? 0),
            'allow_download' => $accessMode === 'public' ? true : !empty($g->allow_download ?? false),
            'face_recognition_enabled' => !empty($g->face_recognition_enabled ?? false),
            'access_mode' => $accessMode,
            'allow_self_signup' => !empty($g->allow_self_signup ?? false),
            'client_folder_layout' => $folderLayout,
            'tutorial_video_url' => !empty($g->tutorial_video_url ?? null) ? trim((string) $g->tutorial_video_url) : null,
            'photos' => $photos,
            'folders' => $folders,
            'locked' => $sel['locked'],
            'thank_you' => [
                'title' => (string) ($g->thank_you_title ?? 'Obrigado!'),
                'message' => $g->thank_you_message ?? null,
                'imageUrl' => $g->thank_you_image_url ?? null,
            ],
            'photographer_name' => (string) ($g->thank_you_photographer_name ?? $g->nome_projeto ?? 'Fotógrafo'),
            'entry_splash_url' => $splash
                ? '/api/king-selection/public/entry-splash?slug='.rawurlencode((string) $g->slug)
                : null,
            'client_entry_splash_enabled' => $splash,
            'currentSelectionRound' => $sel['currentSelectionRound'],
            'deferredSignupActive' => $sel['deferredSignupActive'],
        ];

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'gallery' => $gallery,
                'selectedPhotoIds' => $sel['selectedPhotoIds'],
                'selectionBatchByPhotoId' => (object) $sel['selectionBatchByPhotoId'],
                'approvedPhotoIds' => [],
                'salesModeActive' => $accessMode === 'paid_event_photos',
                'faceRecognitionUsable' => false,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function clientPreview(array $payload, int $photoId, bool $thumb = false): array
    {
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $slug = (string) ($payload['slug'] ?? '');
        if ($galleryId < 1 || $slug === '') {
            return ['status' => 401, 'message' => 'Não autorizado'];
        }
        $p = DB::selectOne(
            'SELECT id FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1',
            [$photoId, $galleryId]
        );
        if (!$p) {
            return ['status' => 404, 'message' => 'Não encontrado'];
        }

        // Reusa fetch via MediaService: path interno; se galeria não for public, bufferFromPath ainda funciona
        $path = null;
        try {
            $row = DB::selectOne(
                'SELECT file_path, edited_file_path FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1',
                [$photoId, $galleryId]
            );
            $edited = trim((string) ($row->edited_file_path ?? ''));
            $fp = trim((string) ($row->file_path ?? ''));
            $path = $edited !== '' ? $edited : ($fp !== '' ? $fp : null);
        } catch (\Throwable) {
            $row = DB::selectOne('SELECT file_path FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1', [$photoId, $galleryId]);
            $path = trim((string) ($row->file_path ?? '')) ?: null;
        }
        if (!$path) {
            return ['status' => 404, 'message' => 'Não encontrado'];
        }

        return $this->media->previewFromStoragePath($path, $thumb, $this->watermarkOpts($payload, $galleryId));
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{enabled:bool, mode:string, opacity:float}|null
     */
    private function watermarkOpts(array $payload, int $galleryId): ?array
    {
        try {
            $g = DB::selectOne(
                'SELECT watermark_mode, watermark_opacity FROM king_galleries WHERE id = ? LIMIT 1',
                [$galleryId]
            );
        } catch (\Throwable) {
            return null;
        }
        if (! $g) {
            return null;
        }
        $mode = strtolower(trim((string) ($g->watermark_mode ?? '')));
        if ($mode === '' || $mode === 'off' || $mode === 'none' || $mode === '0') {
            return null;
        }

        return [
            'enabled' => true,
            'mode' => $mode ?: 'x',
            'opacity' => min(1, max(0.05, (float) ($g->watermark_opacity ?? 0.22))),
        ];
    }

    /**
     * @return list<int>
     */
    private function selectedPhotoIds(int $galleryId, int $clientId): array
    {
        try {
            if ($clientId > 0) {
                $rows = DB::select(
                    'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id = ? ORDER BY id ASC',
                    [$galleryId, $clientId]
                );
            } else {
                $rows = DB::select(
                    'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id IS NULL ORDER BY id ASC',
                    [$galleryId]
                );
            }

            return array_map(static fn ($r) => (int) $r->photo_id, $rows);
        } catch (\Throwable) {
            return [];
        }
    }
}
