<?php

namespace App\Services\CartaoVirtual;

use App\Services\Auth\JwtService;
use App\Support\KingSelection\KsAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * KS cliente — select / select-bulk / finalize (sem PagBank; promo gate mínimo).
 */
class KingSelectionSelectionService
{
    private const DEFAULT_THANK_YOU =
        'Obrigado, {{nome_cliente}}! Sua seleção foi recebida com sucesso. Você escolheu {{quantidade}} foto(s). Nosso retratista {{nome}} agradece pela confiança e pelo carinho.';

    public function __construct(
        private readonly JwtService $jwt,
        private readonly KingSelectionPasswordCrypto $passwordCrypto,
    ) {
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function select(array $payload, string $slug, mixed $photoIdRaw): array
    {
        $slug = trim($slug);
        if ($slug === '' || $photoIdRaw === null || $photoIdRaw === '') {
            return ['status' => 400, 'body' => ['message' => 'slug e photo_id são obrigatórios.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $photoId = (int) $photoIdRaw;
        if ($photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'photo_id inválido.']];
        }

        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = $this->loadGalleryRow($galleryId);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $ctx = KsAccess::parseClientContext($payload);
        if ($this->isLockedForApi($g, $ctx['cid'])) {
            return ['status' => 409, 'body' => ['message' => 'Sua seleção já foi enviada e está em revisão. Aguarde ou peça reativação ao fotógrafo.']];
        }

        $photo = DB::selectOne('SELECT id FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1', [$photoId, $galleryId]);
        if (! $photo) {
            return ['status' => 404, 'body' => ['message' => 'Foto não encontrada.']];
        }

        $round = $this->currentRound($galleryId, $ctx['cid']);
        $hasBatch = Schema::hasColumn('king_selections', 'selection_batch');
        $hasSk = Schema::hasColumn('king_selections', 'session_key');
        $anonSk = ($ctx['sk'] && $hasSk) ? $ctx['sk'] : null;

        // Contar antes de inserir: se já existe = toggle off (ok); se novo = respeitar máximo
        $already = $this->selectionRowExists($galleryId, $photoId, $ctx['cid'], $anonSk);
        if (! $already) {
            $limitErr = $this->assertCanAddSelections($g, $galleryId, $ctx['cid'], $anonSk, 1);
            if ($limitErr !== null) {
                return $limitErr;
            }
        }

        try {
            if ($ctx['cid']) {
                $exists = $hasBatch
                    ? DB::selectOne(
                        'SELECT id, selection_batch FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id = ? LIMIT 1',
                        [$galleryId, $photoId, $ctx['cid']]
                    )
                    : DB::selectOne(
                        'SELECT id FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id = ? LIMIT 1',
                        [$galleryId, $photoId, $ctx['cid']]
                    );
                if ($exists) {
                    if ($hasBatch && ((int) ($exists->selection_batch ?? 1)) < $round) {
                        return ['status' => 409, 'body' => ['message' => 'Esta foto já foi confirmada numa rodada anterior e não pode ser desmarcada.']];
                    }
                    DB::delete('DELETE FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id = ?', [$galleryId, $photoId, $ctx['cid']]);

                    return ['status' => 200, 'body' => ['success' => true, 'selected' => false]];
                }
                if ($hasBatch) {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch) VALUES (?,?,?,NULL,?) ON CONFLICT DO NOTHING',
                        [$galleryId, $photoId, $ctx['cid'], $round]
                    );
                } else {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente) VALUES (?,?,?,NULL) ON CONFLICT DO NOTHING',
                        [$galleryId, $photoId, $ctx['cid']]
                    );
                }
            } else {
                if ($anonSk) {
                    $exists = $hasBatch
                        ? DB::selectOne(
                            'SELECT id, selection_batch FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL AND session_key = ? LIMIT 1',
                            [$galleryId, $photoId, $anonSk]
                        )
                        : DB::selectOne(
                            'SELECT id FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL AND session_key = ? LIMIT 1',
                            [$galleryId, $photoId, $anonSk]
                        );
                } else {
                    $exists = $hasBatch
                        ? DB::selectOne(
                            'SELECT id, selection_batch FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL AND (session_key IS NULL OR session_key = \'\') LIMIT 1',
                            [$galleryId, $photoId]
                        )
                        : DB::selectOne(
                            'SELECT id FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL LIMIT 1',
                            [$galleryId, $photoId]
                        );
                }
                if ($exists) {
                    if ($hasBatch && ((int) ($exists->selection_batch ?? 1)) < $round) {
                        return ['status' => 409, 'body' => ['message' => 'Esta foto já foi confirmada numa rodada anterior e não pode ser desmarcada.']];
                    }
                    if ($anonSk) {
                        DB::delete(
                            'DELETE FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL AND session_key = ?',
                            [$galleryId, $photoId, $anonSk]
                        );
                    } else {
                        DB::delete(
                            'DELETE FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL AND (session_key IS NULL OR session_key = \'\')',
                            [$galleryId, $photoId]
                        );
                    }

                    return ['status' => 200, 'body' => ['success' => true, 'selected' => false]];
                }
                if ($hasBatch && $anonSk) {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch, session_key) VALUES (?, ?, NULL, NULL, ?, ?) ON CONFLICT DO NOTHING',
                        [$galleryId, $photoId, $round, $anonSk]
                    );
                } elseif ($hasBatch) {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch, session_key) VALUES (?, ?, NULL, NULL, ?, NULL) ON CONFLICT DO NOTHING',
                        [$galleryId, $photoId, $round]
                    );
                } elseif ($anonSk) {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, session_key) VALUES (?, ?, NULL, NULL, ?) ON CONFLICT DO NOTHING',
                        [$galleryId, $photoId, $anonSk]
                    );
                } else {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente) VALUES (?, ?, NULL, NULL) ON CONFLICT DO NOTHING',
                        [$galleryId, $photoId]
                    );
                }
            }

            if (! $this->selectionRowExists($galleryId, $photoId, $ctx['cid'], $anonSk)) {
                return ['status' => 409, 'body' => ['message' => 'Não foi possível atualizar a seleção agora. Atualize a página e tente novamente.']];
            }

            $body = ['success' => true, 'selected' => true];
            if ($hasBatch) {
                $body['selection_batch'] = $round;
            }

            return ['status' => 200, 'body' => $body];
        } catch (\Throwable $e) {
            if ($this->isConstraintConflict($e)) {
                return ['status' => 409, 'body' => ['message' => 'Não foi possível atualizar a seleção agora. Atualize a página e tente novamente.']];
            }
            throw $e;
        }
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  list<mixed>|null  $photoIds
     * @return array{status:int, body:array<string,mixed>}
     */
    public function selectBulk(array $payload, string $slug, string $mode, ?array $photoIds): array
    {
        $slug = trim($slug);
        $mode = strtolower(trim($mode));
        if ($slug === '' || $mode === '') {
            return ['status' => 400, 'body' => ['message' => 'slug e mode são obrigatórios.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! in_array($mode, ['select', 'unselect'], true)) {
            return ['status' => 400, 'body' => ['message' => 'mode inválido.']];
        }

        $ids = [];
        foreach ($photoIds ?? [] as $x) {
            $n = (int) $x;
            if ($n > 0) {
                $ids[] = $n;
            }
        }
        $ids = array_values(array_unique($ids));

        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = $this->loadGalleryRow($galleryId);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $ctx = KsAccess::parseClientContext($payload);
        if ($this->isLockedForApi($g, $ctx['cid'])) {
            return ['status' => 409, 'body' => ['message' => 'Sua seleção já foi enviada e está em revisão. Aguarde ou peça reativação ao fotógrafo.']];
        }

        $round = $this->currentRound($galleryId, $ctx['cid']);
        $hasBatch = Schema::hasColumn('king_selections', 'selection_batch');
        $hasSk = Schema::hasColumn('king_selections', 'session_key');
        $anonSk = ($ctx['sk'] && $hasSk) ? $ctx['sk'] : null;

        try {
            if ($mode === 'unselect') {
                $this->bulkUnselect($galleryId, $ctx['cid'], $anonSk, $ids, $round, $hasBatch);

                return ['status' => 200, 'body' => ['success' => true]];
            }

            if ($ids === []) {
                return ['status' => 200, 'body' => ['success' => true]];
            }

            $valid = DB::select(
                'SELECT id FROM king_photos WHERE gallery_id = ? AND id IN ('.$this->placeholders(count($ids)).')',
                array_merge([$galleryId], $ids)
            );
            $validIds = array_map(static fn ($r) => (int) $r->id, $valid);
            if ($validIds === []) {
                return ['status' => 200, 'body' => ['success' => true]];
            }

            $current = $this->countClientSelections($galleryId, $ctx['cid'], $anonSk);
            $alreadySelected = $this->countAlreadySelectedAmong($galleryId, $ctx['cid'], $anonSk, $validIds);
            $toAdd = count($validIds) - $alreadySelected;
            if ($toAdd > 0) {
                $limitErr = $this->assertCanAddSelections($g, $galleryId, $ctx['cid'], $anonSk, $toAdd, $current);
                if ($limitErr !== null) {
                    return $limitErr;
                }
            }

            $this->bulkSelect($galleryId, $ctx['cid'], $anonSk, $validIds, $round, $hasBatch);

            return ['status' => 200, 'body' => ['success' => true]];
        } catch (\Throwable $e) {
            if ($this->isConstraintConflict($e)) {
                return ['status' => 409, 'body' => ['message' => 'Não foi possível atualizar a seleção agora. Atualize a página e tente novamente.']];
            }
            throw $e;
        }
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function finalize(array $payload, string $slug, array $body): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }

        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = $this->loadGalleryRow($galleryId);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $ctx = KsAccess::parseClientContext($payload);
        $cid = $ctx['cid'];
        $sk = $ctx['sk'];
        $feedback = isset($body['feedback']) ? trim((string) $body['feedback']) : '';

        if ($this->isLocked($g, $cid)) {
            return ['status' => 409, 'body' => ['message' => 'Sua seleção já foi enviada. Aguarde a revisão ou solicite reativação ao fotógrafo.']];
        }

        $accessMode = KsAccess::normAccessMode($g->access_mode ?? 'private');
        $hasSkCol = Schema::hasColumn('king_selections', 'session_key');
        $hasClients = Schema::hasTable('king_gallery_clients');
        $hasClientStatus = $hasClients && Schema::hasColumn('king_gallery_clients', 'status');

        $anonSk = ($sk && $hasSkCol) ? $sk : null;
        $selCount = $this->countClientSelections($galleryId, $cid, $anonSk);
        $boundsErr = $this->assertFinalizeBounds($g, $selCount);
        if ($boundsErr !== null) {
            return $boundsErr;
        }

        // Promo pública: exige cupom validado no cliente.
        if ($accessMode === 'public' && Schema::hasColumn('king_galleries', 'promo_enabled') && ! empty($g->promo_enabled ?? false)) {
            $promoOk = false;
            if ($cid && Schema::hasColumn('king_gallery_clients', 'promo_coupon_validated_at')) {
                $pr = DB::selectOne(
                    'SELECT promo_coupon_validated_at FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1',
                    [$cid, $galleryId]
                );
                $promoOk = $pr && ! empty($pr->promo_coupon_validated_at);
            }
            if (! $promoOk) {
                return ['status' => 400, 'body' => [
                    'message' => 'Valide o cupom (siga os perfis e informe o código) antes de confirmar o envio da seleção.',
                ]];
            }
        }

        try {
            // Deferred signup: !cid && sk
            if (! $cid && $sk && $hasSkCol) {
                return $this->finalizeDeferredSignup($payload, $g, $sk, $body, $feedback, $hasClientStatus);
            }

            if ($cid && $hasClients) {
                $c = DB::selectOne(
                    'SELECT id, nome, email, telefone, enabled, status FROM king_gallery_clients WHERE gallery_id = ? AND id = ? LIMIT 1',
                    [$galleryId, $cid]
                );
                if ($c && KsAccess::isTechnicalFaceEmail($c->email ?? '')) {
                    $converted = $this->convertTechnicalClient($galleryId, $cid, $sk, $hasSkCol, $body);
                    if (($converted['status'] ?? 500) !== 200) {
                        return $converted;
                    }
                    $cid = (int) $converted['cid'];
                }
            }

            if ($cid && $hasClientStatus) {
                $sets = ['status = ?', 'updated_at = NOW()'];
                $vals = ['revisao'];
                if ($feedback !== '' && Schema::hasColumn('king_gallery_clients', 'feedback_cliente')) {
                    array_unshift($sets, 'feedback_cliente = ?');
                    array_unshift($vals, mb_substr($feedback, 0, 2000));
                }
                $vals[] = $galleryId;
                $vals[] = $cid;
                DB::update(
                    'UPDATE king_gallery_clients SET '.implode(', ', $sets).' WHERE gallery_id = ? AND id = ?',
                    $vals
                );
            } else {
                // Sem clientId: feedback só desta sessão anónima — nunca de toda a galeria
                if ($feedback !== '') {
                    $fb = mb_substr($feedback, 0, 2000);
                    if ($anonSk) {
                        DB::update(
                            'UPDATE king_selections SET feedback_cliente = ? WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
                            [$fb, $galleryId, $anonSk]
                        );
                    } else {
                        DB::update(
                            'UPDATE king_selections SET feedback_cliente = ? WHERE gallery_id = ? AND client_id IS NULL AND (session_key IS NULL OR session_key = \'\')',
                            [$fb, $galleryId]
                        );
                    }
                }
                // Só marca a galeria em revisão em modo privado single-client (sem tabela de clientes)
                if (! $hasClients || $accessMode === 'private') {
                    DB::update('UPDATE king_galleries SET status = ?, updated_at = NOW() WHERE id = ?', ['revisao', $galleryId]);
                }
            }

            $count = $selCount;

            $clientDisplayName = null;
            if ($cid && $hasClients) {
                $cn = DB::selectOne('SELECT nome FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1', [$cid, $galleryId]);
                $clientDisplayName = $cn && trim((string) ($cn->nome ?? '')) !== '' ? trim((string) $cn->nome) : null;
            }

            $thanks = $this->thankYouPayload($galleryId);
            $out = [
                'success' => true,
                'selectionCount' => $count,
                'photographerDisplayName' => $thanks['photographerDisplayName'],
                'clientDisplayName' => $clientDisplayName,
                'projectName' => $thanks['projectName'],
                'thankYouConfig' => $thanks['thankYouConfig'],
            ];
            if ($cid) {
                $token = $this->jwt->encode([
                    'type' => 'kingselection_client',
                    'galleryId' => $galleryId,
                    'slug' => (string) ($payload['slug'] ?? ''),
                    'clientId' => $cid,
                    'tyh' => true,
                ], '14d');
                $out['token'] = $token;
                $out['clientAccessUrl'] = $this->clientAccessUrl((string) ($payload['slug'] ?? ''), $token);
            }

            return ['status' => 200, 'body' => $out];
        } catch (\Throwable $e) {
            if ($this->isConstraintConflict($e)) {
                return ['status' => 409, 'body' => [
                    'message' => 'Sua seleção neste cadastro já foi enviada. Se quiser selecionar novamente, fale com o fotógrafo para reativar ou abrir nova seleção.',
                ]];
            }
            throw $e;
        }
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{locked:bool, selectedPhotoIds:list<int>, selectionBatchByPhotoId:array<string,int>, currentSelectionRound:int, deferredSignupActive:bool}
     */
    public function gallerySelectionState(array $payload, object $g): array
    {
        $galleryId = (int) $g->id;
        $ctx = KsAccess::parseClientContext($payload);
        $accessMode = KsAccess::normAccessMode($g->access_mode ?? 'private');
        $locked = $this->isLockedForApi($g, $ctx['cid']);
        $round = $this->currentRound($galleryId, $ctx['cid']);
        $hasBatch = Schema::hasColumn('king_selections', 'selection_batch');
        $hasSk = Schema::hasColumn('king_selections', 'session_key');

        $rows = [];
        if ($ctx['cid']) {
            $rows = $hasBatch
                ? DB::select(
                    'SELECT photo_id, selection_batch FROM king_selections WHERE gallery_id = ? AND client_id = ? ORDER BY id ASC',
                    [$galleryId, $ctx['cid']]
                )
                : DB::select(
                    'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id = ? ORDER BY id ASC',
                    [$galleryId, $ctx['cid']]
                );
        } elseif ($ctx['sk'] && $hasSk) {
            $rows = $hasBatch
                ? DB::select(
                    'SELECT photo_id, selection_batch FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? ORDER BY id ASC',
                    [$galleryId, $ctx['sk']]
                )
                : DB::select(
                    'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? ORDER BY id ASC',
                    [$galleryId, $ctx['sk']]
                );
        } elseif ($accessMode !== 'public' && $accessMode !== 'paid_event_photos') {
            $rows = $hasBatch
                ? DB::select(
                    'SELECT photo_id, selection_batch FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND (session_key IS NULL OR session_key = \'\') ORDER BY id ASC',
                    [$galleryId]
                )
                : DB::select(
                    'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id IS NULL ORDER BY id ASC',
                    [$galleryId]
                );
        }

        // Merge cid+sk when public/paid and not locked
        if ($ctx['cid'] && $ctx['sk'] && $hasSk && ! $locked
            && ($accessMode === 'public' || $accessMode === 'paid_event_photos')) {
            $extra = $hasBatch
                ? DB::select(
                    'SELECT photo_id, selection_batch FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? ORDER BY id ASC',
                    [$galleryId, $ctx['sk']]
                )
                : DB::select(
                    'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? ORDER BY id ASC',
                    [$galleryId, $ctx['sk']]
                );
            $seen = [];
            foreach ($rows as $r) {
                $seen[(int) $r->photo_id] = true;
            }
            foreach ($extra as $r) {
                if (! isset($seen[(int) $r->photo_id])) {
                    $rows[] = $r;
                }
            }
        }

        $selected = [];
        $batchMap = [];
        foreach ($rows as $r) {
            $pid = (int) $r->photo_id;
            $selected[] = $pid;
            if ($hasBatch) {
                $batchMap[(string) $pid] = (int) ($r->selection_batch ?? 1) ?: 1;
            }
        }

        $allowSelf = Schema::hasColumn('king_galleries', 'allow_self_signup')
            ? filter_var($g->allow_self_signup ?? false, FILTER_VALIDATE_BOOLEAN)
            : KsAccess::allowsSelfSignup($accessMode);
        $deferred = ! $ctx['cid'] && (bool) $ctx['sk']
            && KsAccess::allowsSelfSignup($accessMode)
            && $allowSelf;

        return [
            'locked' => $locked,
            'selectedPhotoIds' => $selected,
            'selectionBatchByPhotoId' => $batchMap,
            'currentSelectionRound' => $round,
            'deferredSignupActive' => $deferred,
        ];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array<string,mixed>  $body
     * @return array{status:int, body?:array<string,mixed>}
     */
    private function finalizeDeferredSignup(array $payload, object $g, string $sk, array $body, string $feedback, bool $hasClientStatus): array
    {
        $galleryId = (int) $g->id;
        $accessMode = KsAccess::normAccessMode($g->access_mode ?? 'private');
        $allowSelf = Schema::hasColumn('king_galleries', 'allow_self_signup')
            ? filter_var($g->allow_self_signup ?? false, FILTER_VALIDATE_BOOLEAN)
            : KsAccess::allowsSelfSignup($accessMode);
        $publicOk = $accessMode === 'public';
        if (! ($publicOk || (KsAccess::allowsSelfSignup($accessMode) && $allowSelf))) {
            return ['status' => 403, 'body' => ['message' => 'Este envio não está disponível para esta galeria.']];
        }

        $nome = mb_substr(trim((string) ($body['nome'] ?? '')), 0, 255);
        $email = trim((string) ($body['email'] ?? ''));
        $telefone = trim((string) ($body['telefone'] ?? ''));
        if ($nome === '' || $email === '' || $telefone === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe nome, e-mail e telefone para enviar sua seleção.']];
        }
        $emailNorm = strtolower($email);

        $pre = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
            [$galleryId, $sk]
        )->c ?? 0);
        if ($pre < 1) {
            return ['status' => 409, 'body' => [
                'message' => 'Sua seleção neste cadastro já foi enviada. Peça ao fotógrafo para abrir nova seleção ou reativar seu cadastro.',
            ]];
        }

        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 500, 'body' => ['message' => 'Cadastro de clientes indisponível neste servidor.']];
        }

        $pass = (string) random_int(100000, 999999);
        $senhaHash = password_hash($pass, PASSWORD_BCRYPT);
        $hasEnc = Schema::hasColumn('king_gallery_clients', 'senha_enc');

        try {
            $newClientId = DB::transaction(function () use (
                $galleryId, $sk, $nome, $emailNorm, $telefone, $senhaHash, $hasEnc, $pass,
                $feedback, $hasClientStatus
            ) {
                $existing = DB::selectOne(
                    'SELECT id, nome, telefone, status, enabled FROM king_gallery_clients WHERE gallery_id = ? AND lower(email) = lower(?) LIMIT 1',
                    [$galleryId, $emailNorm]
                );

                $mergePhone = null;
                $reactivate = false;
                $newClientId = null;

                if ($existing) {
                    if (isset($existing->enabled) && filter_var($existing->enabled, FILTER_VALIDATE_BOOLEAN) === false) {
                        $reactivate = true;
                        $newClientId = (int) $existing->id;
                        if (trim($telefone) !== '') {
                            $mergePhone = mb_substr($telefone, 0, 120);
                        }
                    } else {
                        if (KsAccess::normStatus($existing->status ?? '') === 'finalizado') {
                            throw new FinalizeHttpException(409, 'Esta seleção já foi finalizada. Fale com o fotógrafo.');
                        }
                        if (KsAccess::normClientNameMatch($existing->nome) !== KsAccess::normClientNameMatch($nome)) {
                            throw new FinalizeHttpException(409, 'Este e-mail já está cadastrado com outro nome. Use os mesmos dados de quando você enviou ou entre com e-mail e senha.');
                        }
                        if (! KsAccess::phoneMatchesStored($existing->telefone ?? '', $telefone)) {
                            throw new FinalizeHttpException(409, 'O telefone não confere com o cadastro deste e-mail. Confira o número ou entre com e-mail e senha.');
                        }
                        if (KsAccess::shouldBackfillPhone($existing->telefone ?? '', $telefone)) {
                            $mergePhone = mb_substr($telefone, 0, 120);
                        }
                        $newClientId = (int) $existing->id;
                    }
                } else {
                    $row = [
                        'gallery_id' => $galleryId,
                        'nome' => $nome,
                        'email' => $emailNorm,
                        'telefone' => $telefone,
                        'senha_hash' => $senhaHash,
                        'enabled' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    if ($hasEnc) {
                        $row['senha_enc'] = $this->passwordCrypto->encrypt($pass);
                    }
                    $newClientId = (int) DB::table('king_gallery_clients')->insertGetId($row);
                }

                DB::update(
                    'UPDATE king_selections SET client_id = ?, session_key = NULL WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
                    [$newClientId, $galleryId, $sk]
                );
                DB::delete(
                    'DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
                    [$galleryId, $sk]
                );

                if ($reactivate) {
                    if ($mergePhone) {
                        DB::update(
                            'UPDATE king_gallery_clients SET enabled = TRUE, nome = ?, telefone = ?, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                            [$nome, $mergePhone, $galleryId, $newClientId]
                        );
                    } else {
                        DB::update(
                            'UPDATE king_gallery_clients SET enabled = TRUE, nome = ?, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                            [$nome, $galleryId, $newClientId]
                        );
                    }
                }

                $maxRound = 1;
                if (Schema::hasColumn('king_selections', 'selection_batch')) {
                    $maxRound = (int) (DB::selectOne(
                        'SELECT COALESCE(MAX(selection_batch),1)::int AS m FROM king_selections WHERE gallery_id = ? AND client_id = ?',
                        [$galleryId, $newClientId]
                    )->m ?? 1);
                }

                if ($hasClientStatus) {
                    $sets = ['status = ?', 'updated_at = NOW()'];
                    $vals = ['revisao'];
                    if ($feedback !== '' && Schema::hasColumn('king_gallery_clients', 'feedback_cliente')) {
                        array_unshift($sets, 'feedback_cliente = ?');
                        array_unshift($vals, mb_substr($feedback, 0, 2000));
                    }
                    if (Schema::hasColumn('king_gallery_clients', 'selection_round')) {
                        $sets[] = 'selection_round = ?';
                        $vals[] = $maxRound;
                    }
                    if ($mergePhone && Schema::hasColumn('king_gallery_clients', 'telefone')) {
                        $sets[] = 'telefone = ?';
                        $vals[] = $mergePhone;
                    }
                    $vals[] = $galleryId;
                    $vals[] = $newClientId;
                    DB::update(
                        'UPDATE king_gallery_clients SET '.implode(', ', $sets).' WHERE gallery_id = ? AND id = ?',
                        $vals
                    );
                }

                return $newClientId;
            });
        } catch (FinalizeHttpException $e) {
            return ['status' => $e->status, 'body' => ['message' => $e->getMessage()]];
        } catch (\Throwable $e) {
            if ($this->isConstraintConflict($e)) {
                return ['status' => 409, 'body' => [
                    'message' => 'Sua seleção neste cadastro já foi enviada. Se quiser selecionar novamente, fale com o fotógrafo para reativar ou abrir nova seleção.',
                ]];
            }
            throw $e;
        }

        $count = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS cnt FROM king_selections WHERE gallery_id = ? AND client_id = ?',
            [$galleryId, $newClientId]
        )->cnt ?? 0);
        $thanks = $this->thankYouPayload($galleryId);
        $token = $this->jwt->encode([
            'type' => 'kingselection_client',
            'galleryId' => $galleryId,
            'slug' => (string) ($payload['slug'] ?? ''),
            'clientId' => $newClientId,
            'tyh' => true,
        ], '14d');

        return ['status' => 200, 'body' => [
            'success' => true,
            'token' => $token,
            'clientAccessUrl' => $this->clientAccessUrl((string) ($payload['slug'] ?? ''), $token),
            'selectionCount' => $count,
            'photographerDisplayName' => $thanks['photographerDisplayName'],
            'clientDisplayName' => $nome,
            'projectName' => $thanks['projectName'],
            'thankYouConfig' => $thanks['thankYouConfig'],
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, cid?:int, body?:array<string,mixed>}
     */
    private function convertTechnicalClient(int $galleryId, int $cid, ?string $sk, bool $hasSkCol, array $body): array
    {
        $nome = mb_substr(trim((string) ($body['nome'] ?? '')), 0, 255);
        $email = trim((string) ($body['email'] ?? ''));
        $telefone = trim((string) ($body['telefone'] ?? ''));
        if ($nome === '' || $email === '' || $telefone === '') {
            return ['status' => 400, 'body' => ['message' => 'Preencha nome, e-mail e WhatsApp para enviar sua seleção.']];
        }
        $emailNorm = strtolower($email);

        try {
            $target = DB::transaction(function () use ($galleryId, $cid, $sk, $hasSkCol, $nome, $emailNorm, $telefone) {
                $existing = DB::selectOne(
                    'SELECT id, nome, telefone, status, enabled FROM king_gallery_clients WHERE gallery_id = ? AND lower(email) = lower(?) LIMIT 1',
                    [$galleryId, $emailNorm]
                );
                $targetId = $cid;
                if ($existing) {
                    $exId = (int) $existing->id;
                    if ($exId > 0 && $exId !== $cid) {
                        if (filter_var($existing->enabled ?? true, FILTER_VALIDATE_BOOLEAN) !== false) {
                            if (KsAccess::normStatus($existing->status ?? '') === 'finalizado') {
                                throw new FinalizeHttpException(409, 'Esta seleção já foi finalizada. Fale com o fotógrafo.');
                            }
                            if (KsAccess::normClientNameMatch($existing->nome) !== KsAccess::normClientNameMatch($nome)) {
                                throw new FinalizeHttpException(409, 'Este e-mail já está cadastrado com outro nome. Use os mesmos dados de quando você enviou ou entre com e-mail e senha.');
                            }
                            if (! KsAccess::phoneMatchesStored($existing->telefone ?? '', $telefone)) {
                                throw new FinalizeHttpException(409, 'O WhatsApp não confere com o cadastro deste e-mail. Confira o número ou entre com e-mail e senha.');
                            }
                        }
                        DB::update(
                            'UPDATE king_selections SET client_id = ?, session_key = NULL WHERE gallery_id = ? AND client_id = ?',
                            [$exId, $galleryId, $cid]
                        );
                        if ($sk && $hasSkCol) {
                            DB::update(
                                'UPDATE king_selections SET client_id = ?, session_key = NULL WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
                                [$exId, $galleryId, $sk]
                            );
                        }
                        DB::update(
                            'UPDATE king_gallery_clients SET enabled = TRUE, nome = ?, telefone = ?, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                            [$nome, mb_substr($telefone, 0, 120), $galleryId, $exId]
                        );
                        DB::delete('DELETE FROM king_gallery_clients WHERE gallery_id = ? AND id = ?', [$galleryId, $cid]);
                        $targetId = $exId;
                    } else {
                        DB::update(
                            'UPDATE king_gallery_clients SET nome = ?, email = ?, telefone = ?, enabled = TRUE, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                            [$nome, $emailNorm, mb_substr($telefone, 0, 120), $galleryId, $cid]
                        );
                    }
                } else {
                    DB::update(
                        'UPDATE king_gallery_clients SET nome = ?, email = ?, telefone = ?, enabled = TRUE, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                        [$nome, $emailNorm, mb_substr($telefone, 0, 120), $galleryId, $cid]
                    );
                    if ($sk && $hasSkCol) {
                        DB::update(
                            'UPDATE king_selections SET client_id = ?, session_key = NULL WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
                            [$cid, $galleryId, $sk]
                        );
                    }
                }

                return $targetId;
            });
        } catch (FinalizeHttpException $e) {
            return ['status' => $e->status, 'body' => ['message' => $e->getMessage()]];
        }

        return ['status' => 200, 'cid' => $target];
    }

    private function loadGalleryRow(int $galleryId): ?object
    {
        if ($galleryId < 1) {
            return null;
        }
        try {
            return DB::selectOne(
                'SELECT id, status, access_mode, allow_self_signup, promo_enabled, nome_projeto,
                        thank_you_title, thank_you_message, thank_you_image_url, thank_you_photographer_name,
                        total_fotos_contratadas, min_selections
                 FROM king_galleries WHERE id = ? LIMIT 1',
                [$galleryId]
            );
        } catch (\Throwable $e) {
            Log::warning('ks.loadGalleryRow', ['error' => $e->getMessage()]);

            return DB::selectOne('SELECT id, status FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}|null
     */
    private function assertCanAddSelections(object $g, int $galleryId, ?int $cid, ?string $anonSk, int $adding, ?int $current = null): ?array
    {
        $max = (int) ($g->total_fotos_contratadas ?? 0);
        if ($max < 1) {
            return null;
        }
        $count = $current ?? $this->countClientSelections($galleryId, $cid, $anonSk);
        if ($count + $adding > $max) {
            return ['status' => 409, 'body' => [
                'message' => "Você pode selecionar no máximo {$max} foto(s). Remova alguma antes de adicionar.",
                'max' => $max,
                'current' => $count,
            ]];
        }

        return null;
    }

    /**
     * @return array{status:int, body:array<string,mixed>}|null
     */
    private function assertFinalizeBounds(object $g, int $count): ?array
    {
        $min = Schema::hasColumn('king_galleries', 'min_selections')
            ? (int) ($g->min_selections ?? 0)
            : 0;
        $max = (int) ($g->total_fotos_contratadas ?? 0);

        if ($min > 0 && $count < $min) {
            return ['status' => 400, 'body' => [
                'message' => "Selecione pelo menos {$min} foto(s) antes de enviar.",
                'min' => $min,
                'current' => $count,
            ]];
        }
        if ($max > 0 && $count > $max) {
            return ['status' => 400, 'body' => [
                'message' => "A seleção tem {$count} foto(s), mas o máximo é {$max}. Remova o excesso.",
                'max' => $max,
                'current' => $count,
            ]];
        }
        if ($count < 1) {
            return ['status' => 400, 'body' => ['message' => 'Selecione ao menos uma foto antes de enviar.']];
        }

        return null;
    }

    private function countClientSelections(int $galleryId, ?int $cid, ?string $anonSk): int
    {
        if ($cid) {
            return (int) (DB::selectOne(
                'SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id = ?',
                [$galleryId, $cid]
            )->c ?? 0);
        }
        if ($anonSk && Schema::hasColumn('king_selections', 'session_key')) {
            return (int) (DB::selectOne(
                'SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
                [$galleryId, $anonSk]
            )->c ?? 0);
        }

        return (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND (session_key IS NULL OR session_key = \'\')',
            [$galleryId]
        )->c ?? 0);
    }

    /**
     * @param  list<int>  $photoIds
     */
    private function countAlreadySelectedAmong(int $galleryId, ?int $cid, ?string $anonSk, array $photoIds): int
    {
        if ($photoIds === []) {
            return 0;
        }
        $ph = $this->placeholders(count($photoIds));
        if ($cid) {
            return (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id IN ($ph)",
                array_merge([$galleryId, $cid], $photoIds)
            )->c ?? 0);
        }
        if ($anonSk && Schema::hasColumn('king_selections', 'session_key')) {
            return (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? AND photo_id IN ($ph)",
                array_merge([$galleryId, $anonSk], $photoIds)
            )->c ?? 0);
        }

        return (int) (DB::selectOne(
            "SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND (session_key IS NULL OR session_key = '') AND photo_id IN ($ph)",
            array_merge([$galleryId], $photoIds)
        )->c ?? 0);
    }

    private function isLocked(object $g, ?int $cid): bool
    {
        $locked = KsAccess::isLockedStatus($g->status ?? '');
        if ($cid && Schema::hasTable('king_gallery_clients') && Schema::hasColumn('king_gallery_clients', 'status')) {
            $st = DB::selectOne(
                'SELECT status FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1',
                [$cid, (int) $g->id]
            );
            if ($st) {
                $norm = KsAccess::normStatus($st->status ?? '');
                if ($norm === 'finalizado') {
                    return true;
                }
                $locked = KsAccess::isLockedStatus($norm);
            }
        }

        return $locked;
    }

    private function isLockedForApi(object $g, ?int $cid): bool
    {
        $am = KsAccess::normAccessMode($g->access_mode ?? 'private');
        $promoOn = Schema::hasColumn('king_galleries', 'promo_enabled') && ! empty($g->promo_enabled ?? false);
        if ($am === 'public' && ! $promoOn) {
            return false;
        }

        return $this->isLocked($g, $cid);
    }

    private function currentRound(int $galleryId, ?int $cid): int
    {
        if ($cid && Schema::hasTable('king_gallery_clients') && Schema::hasColumn('king_gallery_clients', 'selection_round')) {
            $r = DB::selectOne(
                'SELECT selection_round FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1',
                [$cid, $galleryId]
            );
            $v = (int) ($r->selection_round ?? 0);
            if ($v > 0) {
                return $v;
            }
        }
        if (Schema::hasColumn('king_galleries', 'selection_round')) {
            $r = DB::selectOne('SELECT selection_round FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
            $v = (int) ($r->selection_round ?? 0);
            if ($v > 0) {
                return $v;
            }
        }

        return 1;
    }

    private function selectionRowExists(int $galleryId, int $photoId, ?int $cid, ?string $anonSk): bool
    {
        if ($cid) {
            return (bool) DB::selectOne(
                'SELECT id FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id = ? LIMIT 1',
                [$galleryId, $photoId, $cid]
            );
        }
        if ($anonSk) {
            return (bool) DB::selectOne(
                'SELECT id FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL AND session_key = ? LIMIT 1',
                [$galleryId, $photoId, $anonSk]
            );
        }

        return (bool) DB::selectOne(
            'SELECT id FROM king_selections WHERE gallery_id = ? AND photo_id = ? AND client_id IS NULL AND (session_key IS NULL OR session_key = \'\') LIMIT 1',
            [$galleryId, $photoId]
        );
    }

    /**
     * @param  list<int>  $ids
     */
    private function bulkUnselect(int $galleryId, ?int $cid, ?string $anonSk, array $ids, int $round, bool $hasBatch): void
    {
        if ($cid) {
            if ($ids !== []) {
                $ph = $this->placeholders(count($ids));
                if ($hasBatch) {
                    DB::delete(
                        "DELETE FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id IN ($ph) AND selection_batch = ?",
                        array_merge([$galleryId, $cid], $ids, [$round])
                    );
                } else {
                    DB::delete(
                        "DELETE FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id IN ($ph)",
                        array_merge([$galleryId, $cid], $ids)
                    );
                }
            } elseif ($hasBatch) {
                DB::delete('DELETE FROM king_selections WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?', [$galleryId, $cid, $round]);
            } else {
                DB::delete('DELETE FROM king_selections WHERE gallery_id = ? AND client_id = ?', [$galleryId, $cid]);
            }

            return;
        }

        if ($anonSk) {
            if ($ids !== []) {
                $ph = $this->placeholders(count($ids));
                if ($hasBatch) {
                    DB::delete(
                        "DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? AND photo_id IN ($ph) AND selection_batch = ?",
                        array_merge([$galleryId, $anonSk], $ids, [$round])
                    );
                } else {
                    DB::delete(
                        "DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? AND photo_id IN ($ph)",
                        array_merge([$galleryId, $anonSk], $ids)
                    );
                }
            } elseif ($hasBatch) {
                DB::delete(
                    'DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? AND selection_batch = ?',
                    [$galleryId, $anonSk, $round]
                );
            } else {
                DB::delete(
                    'DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ?',
                    [$galleryId, $anonSk]
                );
            }

            return;
        }

        if ($ids !== []) {
            $ph = $this->placeholders(count($ids));
            if ($hasBatch) {
                DB::delete(
                    "DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND photo_id IN ($ph) AND selection_batch = ? AND (session_key IS NULL OR session_key = '')",
                    array_merge([$galleryId], $ids, [$round])
                );
            } else {
                DB::delete(
                    "DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND photo_id IN ($ph)",
                    array_merge([$galleryId], $ids)
                );
            }
        } elseif ($hasBatch) {
            DB::delete(
                "DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND selection_batch = ? AND (session_key IS NULL OR session_key = '')",
                [$galleryId, $round]
            );
        } else {
            DB::delete('DELETE FROM king_selections WHERE gallery_id = ? AND client_id IS NULL', [$galleryId]);
        }
    }

    /**
     * @param  list<int>  $validIds
     */
    private function bulkSelect(int $galleryId, ?int $cid, ?string $anonSk, array $validIds, int $round, bool $hasBatch): void
    {
        foreach ($validIds as $pid) {
            if ($cid) {
                if ($hasBatch) {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, selection_batch) VALUES (?,?,?,NULL,?) ON CONFLICT DO NOTHING',
                        [$galleryId, $cid, $pid, $round]
                    );
                } else {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente) VALUES (?,?,?,NULL) ON CONFLICT DO NOTHING',
                        [$galleryId, $cid, $pid]
                    );
                }
            } elseif ($anonSk) {
                if ($hasBatch) {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, selection_batch, session_key) VALUES (?, NULL, ?, NULL, ?, ?) ON CONFLICT DO NOTHING',
                        [$galleryId, $pid, $round, $anonSk]
                    );
                } else {
                    DB::insert(
                        'INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, session_key) VALUES (?, NULL, ?, NULL, ?) ON CONFLICT DO NOTHING',
                        [$galleryId, $pid, $anonSk]
                    );
                }
            } elseif ($hasBatch) {
                DB::insert(
                    'INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, selection_batch, session_key) VALUES (?, NULL, ?, NULL, ?, NULL) ON CONFLICT DO NOTHING',
                    [$galleryId, $pid, $round]
                );
            } else {
                DB::insert(
                    'INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente) VALUES (?, NULL, ?, NULL) ON CONFLICT DO NOTHING',
                    [$galleryId, $pid]
                );
            }
        }
    }

    /**
     * @return array{photographerDisplayName:string, projectName:?string, thankYouConfig:array{title:string, message:string, imageUrl:?string}}
     */
    private function thankYouPayload(int $galleryId): array
    {
        $photographer = 'Fotógrafo';
        $project = null;
        $cfg = ['title' => 'Obrigado!', 'message' => self::DEFAULT_THANK_YOU, 'imageUrl' => null];
        try {
            $row = DB::selectOne(
                'SELECT nome_projeto, thank_you_title, thank_you_message, thank_you_image_url, thank_you_photographer_name
                 FROM king_galleries WHERE id = ? LIMIT 1',
                [$galleryId]
            );
            if ($row) {
                if (trim((string) ($row->nome_projeto ?? '')) !== '') {
                    $project = trim((string) $row->nome_projeto);
                }
                if (trim((string) ($row->thank_you_photographer_name ?? '')) !== '') {
                    $photographer = trim((string) $row->thank_you_photographer_name);
                } else {
                    $photographer = $project ?: $photographer;
                    try {
                        $n = DB::selectOne(
                            'SELECT COALESCE(p.display_name, u.email, \'\') AS name
                             FROM king_galleries g
                             JOIN profile_items pi ON pi.id = g.profile_item_id
                             JOIN users u ON u.id = pi.user_id
                             LEFT JOIN user_profiles p ON p.user_id = u.id
                             WHERE g.id = ? LIMIT 1',
                            [$galleryId]
                        );
                        if ($n && trim((string) ($n->name ?? '')) !== '') {
                            $photographer = trim((string) $n->name);
                        }
                    } catch (\Throwable) {
                    }
                }
                $custom = isset($row->thank_you_message) && trim((string) $row->thank_you_message) !== ''
                    ? trim((string) $row->thank_you_message)
                    : null;
                $cfg = [
                    'title' => (string) ($row->thank_you_title ?: 'Obrigado!'),
                    'message' => $custom ?: self::DEFAULT_THANK_YOU,
                    'imageUrl' => $row->thank_you_image_url ?: null,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('ks.thankYou', ['error' => $e->getMessage()]);
        }

        return [
            'photographerDisplayName' => $photographer,
            'projectName' => $project,
            'thankYouConfig' => $cfg,
        ];
    }

    private function clientAccessUrl(string $slug, string $token): string
    {
        $base = rtrim((string) (env('SHARE_BASE_URL') ?: env('APP_URL') ?: ''), '/');
        $path = '/kingSelection/'.rawurlencode(trim($slug));
        $q = 'access='.rawurlencode($token);

        return $base !== '' ? $base.$path.'?'.$q : $path.'?'.$q;
    }

    private function placeholders(int $n): string
    {
        return implode(',', array_fill(0, max(1, $n), '?'));
    }

    private function isConstraintConflict(\Throwable $e): bool
    {
        $msg = strtolower($e->getMessage());
        $code = method_exists($e, 'getCode') ? (string) $e->getCode() : '';

        return in_array($code, ['23503', '23505', '23514'], true)
            || str_contains($msg, 'constraint')
            || str_contains($msg, 'unique')
            || str_contains($msg, 'foreign key')
            || str_contains($msg, 'violação');
    }
}
