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
