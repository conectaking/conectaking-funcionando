<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GuestListPublicService
{
    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    public function registerPage(string $token): array
    {
        $list = $this->findByRegistrationToken($token);
        if (!$list) {
            return ['status' => 404, 'message' => 'Link de inscrição inválido ou expirado'];
        }
        $current = $this->guestCount((int) $list['id']);
        $max = isset($list['max_guests']) ? (int) $list['max_guests'] : 0;
        $isFull = $max > 0 && $current >= $max;
        $canRegister = !empty($list['allow_self_registration']) && !$isFull;

        return [
            'status' => 200,
            'view' => 'cartao.guest-register',
            'data' => [
                'guestList' => $list,
                'isFull' => $isFull,
                'canRegister' => $canRegister,
                'currentCount' => $current,
                'maxGuests' => $max > 0 ? $max : null,
                'submitUrl' => '/api/guest-lists/public/register/'.rawurlencode($token),
                'token' => $token,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function registerSubmit(string $token, array $body): array
    {
        $list = $this->findByRegistrationToken($token);
        if (!$list) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Link de inscrição inválido']];
        }
        if (empty($list['allow_self_registration'])) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Inscrições não estão abertas para este evento']];
        }

        $name = trim((string) ($body['name'] ?? ''));
        $whatsapp = trim((string) ($body['whatsapp'] ?? ''));
        $document = trim((string) ($body['document'] ?? ''));
        if ($name === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Nome completo é obrigatório']];
        }
        if ($whatsapp === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'WhatsApp é obrigatório']];
        }
        if ($document === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'CPF/CNPJ é obrigatório']];
        }

        $listId = (int) $list['id'];
        $max = isset($list['max_guests']) ? (int) $list['max_guests'] : 0;
        if ($max > 0 && $this->guestCount($listId) >= $max) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Limite de convidados atingido']];
        }

        $qrToken = bin2hex(random_bytes(32));
        $status = !empty($list['require_confirmation']) ? 'registered' : 'confirmed';
        $custom = $body['custom_responses'] ?? [];
        if (!is_array($custom)) {
            $custom = [];
        }

        try {
            $row = DB::selectOne(
                'INSERT INTO guests (
                    guest_list_id, name, email, phone, whatsapp, document,
                    address, neighborhood, city, state, zipcode, instagram,
                    status, registration_source, qr_token, qr_code_generated_at, custom_responses
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'self\', ?, NOW(), ?::jsonb)
                 RETURNING id, name, status, qr_token',
                [
                    $listId,
                    $name,
                    $this->nullableTrim($body['email'] ?? null),
                    $this->nullableTrim($body['phone'] ?? null),
                    $whatsapp,
                    $document,
                    $this->nullableTrim($body['address'] ?? null),
                    $this->nullableTrim($body['neighborhood'] ?? null),
                    $this->nullableTrim($body['city'] ?? null),
                    $this->nullableTrim($body['state'] ?? null),
                    $this->nullableTrim($body['zipcode'] ?? null),
                    $this->nullableTrim($body['instagram'] ?? null),
                    $status,
                    $qrToken,
                    json_encode($custom, JSON_UNESCAPED_UNICODE),
                ]
            );
            if ($status === 'confirmed' && $row) {
                DB::update('UPDATE guests SET confirmed_at = NOW(), status = ? WHERE id = ?', ['confirmed', $row->id]);
            }
        } catch (\Throwable $e) {
            // fallback sem custom_responses column
            try {
                $row = DB::selectOne(
                    'INSERT INTO guests (
                        guest_list_id, name, email, phone, whatsapp, document,
                        address, neighborhood, city, state, zipcode, instagram,
                        status, registration_source, qr_token, qr_code_generated_at
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'self\', ?, NOW())
                     RETURNING id, name, status, qr_token',
                    [
                        $listId,
                        $name,
                        $this->nullableTrim($body['email'] ?? null),
                        $this->nullableTrim($body['phone'] ?? null),
                        $whatsapp,
                        $document,
                        $this->nullableTrim($body['address'] ?? null),
                        $this->nullableTrim($body['neighborhood'] ?? null),
                        $this->nullableTrim($body['city'] ?? null),
                        $this->nullableTrim($body['state'] ?? null),
                        $this->nullableTrim($body['zipcode'] ?? null),
                        $this->nullableTrim($body['instagram'] ?? null),
                        $status,
                        $qrToken,
                    ]
                );
                if ($status === 'confirmed' && $row) {
                    DB::update('UPDATE guests SET confirmed_at = NOW() WHERE id = ?', [$row->id]);
                }
            } catch (\Throwable $e2) {
                Log::error('guest.register', ['error' => $e2->getMessage()]);

                return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao registrar convidado']];
            }
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'guest' => $row ? (array) $row : null,
                'requires_confirmation' => !empty($list['require_confirmation']),
            ],
        ];
    }

    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    public function confirmPage(string $identifier): array
    {
        $list = $this->findByConfirmationToken($identifier);
        if (!$list && ctype_digit($identifier)) {
            $list = $this->findByProfileItemId((int) $identifier);
        }
        if (!$list) {
            return ['status' => 404, 'message' => 'Link de confirmação inválido ou expirado'];
        }
        $token = (string) ($list['confirmation_token'] ?? '');
        $guests = $this->listGuestsForConfirm((int) $list['id']);

        return [
            'status' => 200,
            'view' => 'cartao.guest-confirm',
            'data' => [
                'guestList' => $list,
                'guests' => $guests,
                'token' => $token,
                'confirmUrl' => $token !== ''
                    ? '/api/guest-lists/public/confirm/'.rawurlencode($token)
                    : null,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function confirmSubmit(string $token, array $body): array
    {
        $list = $this->findByConfirmationToken($token);
        if (!$list) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Link de confirmação inválido']];
        }
        $ids = $body['guest_ids'] ?? [];
        if (!is_array($ids) || $ids === []) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'IDs de convidados são obrigatórios']];
        }
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($id) => $id > 0));
        if ($ids === []) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'IDs de convidados são obrigatórios']];
        }
        $ph = implode(',', array_fill(0, count($ids), '?'));
        try {
            $rows = DB::select(
                "UPDATE guests SET status = 'confirmed', confirmed_at = NOW()
                 WHERE guest_list_id = ? AND id IN ({$ph}) AND status = 'registered'
                 RETURNING id, name, status",
                array_merge([(int) $list['id']], $ids)
            );
        } catch (\Throwable $e) {
            Log::error('guest.confirm', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao confirmar convidados']];
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'confirmed_count' => count($rows),
                'guests' => array_map(static fn ($r) => (array) $r, $rows),
            ],
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function findByConfirmationToken(string $token): ?array
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }
        try {
            $row = DB::selectOne(
                "SELECT gli.*, pi.title, pi.user_id, u.profile_slug
                 FROM guest_list_items gli
                 INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                 INNER JOIN users u ON u.id = pi.user_id
                 WHERE gli.confirmation_token = ? AND pi.is_active = true
                 LIMIT 1",
                [$token]
            );
        } catch (\Throwable) {
            return null;
        }

        return $row ? $this->normalizeList((array) $row) : null;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function findByProfileItemId(int $itemId): ?array
    {
        try {
            $row = DB::selectOne(
                "SELECT gli.*, pi.title, pi.user_id, u.profile_slug
                 FROM guest_list_items gli
                 INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                 INNER JOIN users u ON u.id = pi.user_id
                 WHERE pi.id = ? AND pi.is_active = true
                 LIMIT 1",
                [$itemId]
            );
        } catch (\Throwable) {
            return null;
        }

        return $row ? $this->normalizeList((array) $row) : null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function listGuestsForConfirm(int $listId): array
    {
        try {
            $rows = DB::select(
                "SELECT id, name, email, phone, status, created_at
                 FROM guests
                 WHERE guest_list_id = ? AND status IN ('registered', 'confirmed')
                 ORDER BY created_at DESC",
                [$listId]
            );
        } catch (\Throwable) {
            return [];
        }

        return array_map(static fn ($r) => (array) $r, $rows);
    }

    /**
     * @param  array<string,mixed>  $list
     * @return array<string,mixed>
     */
    private function normalizeList(array $list): array
    {
        if (isset($list['custom_form_fields']) && is_string($list['custom_form_fields'])) {
            $parsed = json_decode($list['custom_form_fields'], true);
            $list['custom_form_fields'] = is_array($parsed) ? $parsed : [];
        } elseif (!is_array($list['custom_form_fields'] ?? null)) {
            $list['custom_form_fields'] = [];
        }
        $list['primary_color'] = $list['primary_color'] ?? '#FFC700';
        $list['text_color'] = $list['text_color'] ?? '#ECECEC';
        $list['background_color'] = $list['background_color'] ?? '#0D0D0F';
        $list['theme'] = $list['theme'] ?? 'dark';
        $list['event_title'] = $list['event_title'] ?? ($list['title'] ?? 'Evento');

        return $list;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function findByRegistrationToken(string $token): ?array
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }
        try {
            $row = DB::selectOne(
                "SELECT gli.*, pi.title, pi.user_id, u.profile_slug
                 FROM guest_list_items gli
                 INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                 INNER JOIN users u ON u.id = pi.user_id
                 WHERE gli.registration_token = ? AND pi.is_active = true
                 LIMIT 1",
                [$token]
            );
        } catch (\Throwable) {
            return null;
        }
        if (!$row) {
            return null;
        }

        return $this->normalizeList((array) $row);
    }

    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    public function portariaPage(string $token): array
    {
        $list = $this->findByPortariaToken($token);
        if (!$list) {
            return ['status' => 404, 'message' => 'Portaria não encontrada'];
        }
        $listId = (int) $list['id'];
        $all = $this->listAllGuests($listId);
        $checkedIn = array_values(array_filter($all, static fn ($g) => ($g['status'] ?? '') === 'checked_in'));
        $confirmed = array_values(array_filter($all, static fn ($g) => ($g['status'] ?? '') === 'confirmed'));
        $registered = array_values(array_filter($all, static fn ($g) => ($g['status'] ?? '') === 'registered'));
        $notArrived = array_values(array_filter($all, static fn ($g) => ($g['status'] ?? '') !== 'checked_in'));
        $tok = rawurlencode($token);

        return [
            'status' => 200,
            'view' => 'cartao.guest-portaria',
            'data' => [
                'guestList' => $list,
                'token' => $token,
                'allGuests' => $all,
                'checkedIn' => $checkedIn,
                'confirmed' => $confirmed,
                'registered' => $registered,
                'notArrived' => $notArrived,
                'counts' => [
                    'total' => count($all),
                    'checked_in' => count($checkedIn),
                    'confirmed' => count($confirmed),
                    'registered' => count($registered),
                    'not_arrived' => count($notArrived),
                ],
                'checkinUrlBase' => '/portaria/'.$tok.'/checkin/',
                'searchUrl' => '/guest-list/confirm/cpf',
                'verifyQrUrlBase' => '/guest-list/verify/qr/',
                'confirmQrUrlBase' => '/guest-list/confirm/qr/',
            ],
        ];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function portariaCheckin(string $token, string $guestId): array
    {
        $list = $this->findByPortariaToken($token);
        if (!$list) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Lista não encontrada']];
        }
        if (!ctype_digit($guestId) || (int) $guestId < 1) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Convidado inválido']];
        }
        $gid = (int) $guestId;
        $guest = DB::selectOne(
            'SELECT id, name, status FROM guests WHERE id = ? AND guest_list_id = ?',
            [$gid, (int) $list['id']]
        );
        if (!$guest) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Convidado não encontrado']];
        }
        try {
            $row = DB::selectOne(
                "UPDATE guests
                 SET status = 'checked_in', checked_in_at = NOW(),
                     confirmed_at = COALESCE(confirmed_at, NOW()), updated_at = NOW()
                 WHERE id = ? AND guest_list_id = ?
                 RETURNING id, name, status, checked_in_at",
                [$gid, (int) $list['id']]
            );
        } catch (\Throwable $e) {
            try {
                $row = DB::selectOne(
                    "UPDATE guests
                     SET status = 'checked_in', checked_in_at = NOW()
                     WHERE id = ? AND guest_list_id = ?
                     RETURNING id, name, status, checked_in_at",
                    [$gid, (int) $list['id']]
                );
            } catch (\Throwable $e2) {
                Log::error('guest.portariaCheckin', ['error' => $e2->getMessage()]);

                return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao atualizar status']];
            }
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'message' => 'Chegada confirmada com sucesso',
                'guest' => $row ? (array) $row : null,
            ],
        ];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function verifyQr(string $qrToken): array
    {
        $normalized = trim($qrToken);
        if (strlen($normalized) < 32) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'QR Code inválido. O token está muito curto.']];
        }
        try {
            $guest = DB::selectOne(
                "SELECT g.*, gli.event_date, gli.event_title, gli.event_location, pi.title AS form_title
                 FROM guests g
                 INNER JOIN guest_list_items gli ON gli.id = g.guest_list_id
                 LEFT JOIN profile_items pi ON pi.id = gli.profile_item_id
                 WHERE g.qr_token = ?
                 LIMIT 1",
                [$normalized]
            );
        } catch (\Throwable $e) {
            Log::error('guest.verifyQr', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao verificar QR Code.']];
        }
        if (!$guest) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'QR Code não encontrado.']];
        }
        if (!empty($guest->event_date) && $this->qrExpired((string) $guest->event_date)) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'QR Code expirado.', 'expired' => true]];
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'guest' => [
                    'id' => $guest->id,
                    'name' => $guest->name,
                    'email' => $guest->email ?? null,
                    'whatsapp' => $guest->whatsapp ?? null,
                    'status' => $guest->status,
                    'checked_in_at' => $guest->checked_in_at ?? null,
                    'guest_list_id' => $guest->guest_list_id,
                ],
                'event' => [
                    'title' => $guest->event_title ?: ($guest->form_title ?? 'Evento'),
                    'date' => $guest->event_date ?? null,
                    'location' => $guest->event_location ?? '',
                ],
                'alreadyCheckedIn' => ($guest->status ?? '') === 'checked_in',
            ],
        ];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function confirmQr(string $qrToken): array
    {
        $normalized = trim($qrToken);
        if (strlen($normalized) < 32) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'QR Code inválido. O token está muito curto.']];
        }
        try {
            $guest = DB::selectOne(
                'SELECT g.*, gli.event_date FROM guests g
                 INNER JOIN guest_list_items gli ON gli.id = g.guest_list_id
                 WHERE g.qr_token = ? LIMIT 1',
                [$normalized]
            );
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao confirmar QR Code.']];
        }
        if (!$guest) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'QR Code não encontrado.']];
        }
        if (!empty($guest->event_date) && $this->qrExpired((string) $guest->event_date)) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'QR Code expirado.']];
        }
        if (($guest->status ?? '') === 'checked_in') {
            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Presença já confirmada anteriormente',
                    'guest' => [
                        'id' => $guest->id,
                        'name' => $guest->name,
                        'status' => $guest->status,
                        'checked_in_at' => $guest->checked_in_at ?? null,
                    ],
                ],
            ];
        }
        try {
            $row = DB::selectOne(
                "UPDATE guests SET status = 'checked_in', checked_in_at = NOW(),
                    confirmed_at = COALESCE(confirmed_at, NOW())
                 WHERE id = ?
                 RETURNING id, name, status, checked_in_at",
                [$guest->id]
            );
        } catch (\Throwable $e) {
            $row = DB::selectOne(
                "UPDATE guests SET status = 'checked_in', checked_in_at = NOW() WHERE id = ?
                 RETURNING id, name, status, checked_in_at",
                [$guest->id]
            );
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'message' => 'Presença confirmada com sucesso',
                'guest' => $row ? (array) $row : null,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function confirmBySearch(array $body): array
    {
        $token = trim((string) ($body['token'] ?? ''));
        $searchTerm = trim((string) ($body['search'] ?? $body['cpf'] ?? ''));
        if ($searchTerm === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Digite CPF, Email ou Nome para buscar']];
        }
        if ($token === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Token é obrigatório']];
        }
        if (mb_strlen($searchTerm) < 2) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Digite pelo menos 2 caracteres para buscar']];
        }
        $list = $this->findByPortariaToken($token);
        if (!$list) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Token inválido ou lista não encontrada']];
        }
        $listId = (int) $list['id'];
        $clean = preg_replace('/\D+/', '', $searchTerm) ?? '';
        $isNumeric = $clean !== '' && ctype_digit($clean);

        try {
            if ($isNumeric && strlen($clean) === 11 && $this->isValidCpf($clean)) {
                $rows = DB::select(
                    "SELECT * FROM guests
                     WHERE guest_list_id = ?
                       AND document IS NOT NULL AND document != ''
                       AND REGEXP_REPLACE(document, '[^0-9]', '', 'g') = ?",
                    [$listId, $clean]
                );
            } elseif ($isNumeric && strlen($clean) >= 10 && strlen($clean) <= 13) {
                // Telefone / WhatsApp — nunca buscar como documento/CPF
                $rows = DB::select(
                    "SELECT * FROM guests
                     WHERE guest_list_id = ?
                       AND (
                         REGEXP_REPLACE(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') LIKE ?
                         OR REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE ?
                       )
                     ORDER BY name ASC LIMIT 10",
                    [$listId, '%'.$clean, '%'.$clean]
                );
            } elseif ($isNumeric) {
                // Prefixo numérico curto: não faz check-in automático; exige CPF completo
                return [
                    'status' => 400,
                    'body' => [
                        'success' => false,
                        'message' => 'Informe o CPF completo (11 dígitos) ou busque por nome/e-mail.',
                    ],
                ];
            } else {
                $pattern = '%'.$searchTerm.'%';
                $rows = DB::select(
                    "SELECT * FROM guests
                     WHERE guest_list_id = ?
                       AND (name ILIKE ? OR email ILIKE ? OR COALESCE(whatsapp, phone, '') ILIKE ?)
                     ORDER BY name ASC LIMIT 10",
                    [$listId, $pattern, $pattern, $pattern]
                );
            }
        } catch (\Throwable $e) {
            Log::error('guest.confirmBySearch', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro na busca']];
        }

        if (count($rows) > 1) {
            return [
                'status' => 200,
                'body' => [
                    'success' => false,
                    'partial' => true,
                    'message' => 'Encontrados '.count($rows).' convidados. Digite mais caracteres para refinar a busca.',
                    'matches' => count($rows),
                    'suggestions' => array_map(static function ($g) {
                        $doc = (string) ($g->document ?? '');

                        return [
                            'id' => $g->id,
                            'name' => $g->name,
                            'email' => $g->email ?: '-',
                            'cpf' => $doc !== '' ? (strlen($doc) > 3 ? substr($doc, 0, 3).'***.***-**' : '***') : '-',
                        ];
                    }, array_slice($rows, 0, 5)),
                ],
            ];
        }
        if ($rows === []) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Nenhum convidado encontrado com os dados informados']];
        }
        // Auto check-in só com match único de CPF completo válido (não por telefone/nome parcial)
        $autoCheckin = $isNumeric && strlen($clean) === 11 && $this->isValidCpf($clean);
        if (! $autoCheckin) {
            $g = $rows[0];
            $doc = (string) ($g->document ?? '');

            return [
                'status' => 200,
                'body' => [
                    'success' => false,
                    'partial' => true,
                    'message' => 'Convidado encontrado. Confirme o check-in na lista.',
                    'matches' => 1,
                    'suggestions' => [[
                        'id' => $g->id,
                        'name' => $g->name,
                        'email' => $g->email ?: '-',
                        'cpf' => $doc !== '' ? (strlen($doc) > 3 ? substr($doc, 0, 3).'***.***-**' : '***') : '-',
                    ]],
                ],
            ];
        }
        $guest = $rows[0];
        if (($guest->status ?? '') === 'checked_in') {
            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Presença já confirmada anteriormente',
                    'guest' => [
                        'id' => $guest->id,
                        'name' => $guest->name,
                        'status' => $guest->status,
                        'checked_in_at' => $guest->checked_in_at ?? null,
                    ],
                ],
            ];
        }
        try {
            $row = DB::selectOne(
                "UPDATE guests SET status = 'checked_in', checked_in_at = NOW(),
                    confirmed_at = COALESCE(confirmed_at, NOW())
                 WHERE id = ?
                 RETURNING id, name, email, whatsapp, status, checked_in_at, guest_list_id",
                [$guest->id]
            );
        } catch (\Throwable) {
            $row = DB::selectOne(
                "UPDATE guests SET status = 'checked_in', checked_in_at = NOW() WHERE id = ?
                 RETURNING id, name, status, checked_in_at",
                [$guest->id]
            );
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'message' => 'Presença confirmada com sucesso',
                'guest' => $row ? (array) $row : null,
            ],
        ];
    }

    private function isValidCpf(string $digits): bool
    {
        if (strlen($digits) !== 11 || preg_match('/^(\d)\1{10}$/', $digits)) {
            return false;
        }
        for ($t = 9; $t < 11; $t++) {
            $sum = 0;
            for ($i = 0; $i < $t; $i++) {
                $sum += (int) $digits[$i] * (($t + 1) - $i);
            }
            $digit = ((10 * $sum) % 11) % 10;
            if ((int) $digits[$t] !== $digit) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function findByPortariaToken(string $token): ?array
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }
        try {
            $row = DB::selectOne(
                "SELECT gli.*, pi.id AS profile_item_id, pi.title, pi.user_id, u.profile_slug
                 FROM guest_list_items gli
                 INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                 INNER JOIN users u ON u.id = pi.user_id
                 WHERE (
                    gli.public_view_token = ?
                    OR gli.confirmation_token = ?
                    OR gli.portaria_slug = ?
                 ) AND pi.is_active = true
                 LIMIT 1",
                [$token, $token, $token]
            );
        } catch (\Throwable) {
            try {
                $row = DB::selectOne(
                    "SELECT gli.*, pi.id AS profile_item_id, pi.title, pi.user_id, u.profile_slug
                     FROM guest_list_items gli
                     INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                     INNER JOIN users u ON u.id = pi.user_id
                     WHERE (gli.public_view_token = ? OR gli.confirmation_token = ?)
                       AND pi.is_active = true
                     LIMIT 1",
                    [$token, $token]
                );
            } catch (\Throwable) {
                return null;
            }
        }

        return $row ? $this->normalizeList((array) $row) : null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function listAllGuests(int $listId): array
    {
        try {
            $rows = DB::select(
                "SELECT id, name, email, phone, whatsapp, document, status, created_at, confirmed_at, checked_in_at
                 FROM guests WHERE guest_list_id = ?
                 ORDER BY CASE status
                    WHEN 'checked_in' THEN 1
                    WHEN 'confirmed' THEN 2
                    WHEN 'registered' THEN 3
                    ELSE 4 END, name ASC",
                [$listId]
            );
        } catch (\Throwable) {
            return [];
        }

        return array_map(static fn ($r) => (array) $r, $rows);
    }

    private function qrExpired(string $eventDate): bool
    {
        try {
            $event = new \DateTimeImmutable($eventDate);
            $exp = $event->modify('+30 days');

            return new \DateTimeImmutable('now') > $exp;
        } catch (\Throwable) {
            return false;
        }
    }

    private function guestCount(int $listId): int
    {
        try {
            $r = DB::selectOne('SELECT COUNT(*)::int AS n FROM guests WHERE guest_list_id = ?', [$listId]);

            return (int) ($r->n ?? 0);
        } catch (\Throwable) {
            return 0;
        }
    }

    private function nullableTrim(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = trim((string) $v);

        return $s === '' ? null : $s;
    }
}
