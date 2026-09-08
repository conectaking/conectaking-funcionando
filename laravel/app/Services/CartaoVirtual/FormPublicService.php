<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FormPublicService
{
    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    public function loadByShareToken(string $token): array
    {
        $slug = trim($token);
        if ($slug === '') {
            return ['status' => 400, 'message' => 'Token inválido.'];
        }

        $item = null;
        try {
            $item = DB::selectOne(
                "SELECT pi.*, u.profile_slug, u.account_type
                 FROM profile_items pi
                 INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
                 INNER JOIN users u ON pi.user_id = u.id
                 INNER JOIN cadastro_links cl ON cl.guest_list_item_id = gli.id
                 WHERE cl.slug = ? AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active = true
                 LIMIT 1",
                [$slug]
            );
        } catch (\Throwable $e) {
            // tabela pode não existir
        }
        if (!$item) {
            try {
                $item = DB::selectOne(
                    "SELECT pi.*, u.profile_slug, u.account_type
                     FROM profile_items pi
                     INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
                     INNER JOIN users u ON pi.user_id = u.id
                     WHERE gli.cadastro_slug = ? AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active = true
                     LIMIT 1",
                    [$slug]
                );
            } catch (\Throwable $e) {
            }
        }
        if (!$item) {
            try {
                $item = DB::selectOne(
                    "SELECT pi.*, u.profile_slug, u.account_type
                     FROM profile_items pi
                     INNER JOIN users u ON pi.user_id = u.id
                     WHERE pi.item_type IN ('digital_form','guest_list') AND pi.is_active = true
                       AND pi.share_token = ?
                     LIMIT 1",
                    [$slug]
                );
            } catch (\Throwable $e) {
            }
        }
        if (!$item) {
            return ['status' => 404, 'message' => 'Formulário não encontrado.'];
        }
        if (($item->account_type ?? '') === 'free') {
            return ['status' => 403, 'view' => 'cartao.inactive', 'data' => []];
        }

        return $this->buildViewData((array) $item);
    }

    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    public function loadBySlugAndItem(string $slug, string $itemId): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'message' => 'ID do formulário inválido.'];
        }
        $user = DB::selectOne(
            'SELECT id, account_type, profile_slug FROM users WHERE profile_slug = ? OR id = ? LIMIT 1',
            [$slug, $slug]
        );
        if (!$user) {
            return ['status' => 404, 'message' => 'Perfil não encontrado.'];
        }
        if (($user->account_type ?? '') === 'free') {
            return ['status' => 403, 'view' => 'cartao.inactive', 'data' => []];
        }
        $item = DB::selectOne(
            "SELECT pi.*, ?::text AS profile_slug, ?::text AS account_type
             FROM profile_items pi
             WHERE pi.id = ? AND pi.user_id = ? AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active = true
             LIMIT 1",
            [$user->profile_slug, $user->account_type, (int) $itemId, $user->id]
        );
        if (!$item) {
            return ['status' => 404, 'message' => 'Formulário não encontrado.'];
        }

        return $this->buildViewData((array) $item);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function submit(string $slug, string $itemId, array $body): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'ID inválido.']];
        }
        $id = (int) $itemId;
        $item = DB::selectOne(
            "SELECT pi.id FROM profile_items pi
             JOIN users u ON u.id = pi.user_id
             WHERE pi.id = ? AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active = true
               AND (u.profile_slug = ? OR u.id = ? OR ? = 'form')
             LIMIT 1",
            [$id, $slug, $slug, $slug]
        );
        if (!$item) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Formulário não encontrado.']];
        }

        $responseData = $body['response_data'] ?? [];
        if (is_string($responseData)) {
            $parsed = json_decode($responseData, true);
            $responseData = is_array($parsed) ? $parsed : [];
        }
        if (!is_array($responseData)) {
            $responseData = [];
        }

        $formRow = DB::selectOne(
            'SELECT form_fields, success_message FROM digital_form_items WHERE profile_item_id = ?
             ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
            [$id]
        );
        $fields = [];
        if ($formRow && is_string($formRow->form_fields ?? null)) {
            $parsedFields = json_decode((string) $formRow->form_fields, true);
            $fields = is_array($parsedFields) ? $parsedFields : [];
        } elseif ($formRow && is_array($formRow->form_fields ?? null)) {
            $fields = $formRow->form_fields;
        }

        foreach ($fields as $field) {
            if (empty($field['required'])) {
                continue;
            }
            $fid = (string) ($field['id'] ?? '');
            if ($fid === '') {
                continue;
            }
            $val = $responseData[$fid] ?? null;
            $empty = $val === null || $val === '' || (is_array($val) && count($val) === 0);
            if ($empty) {
                $label = (string) ($field['label'] ?? 'Campo obrigatório');

                return [
                    'status' => 422,
                    'body' => [
                        'success' => false,
                        'message' => "Preencha o campo obrigatório: {$label}",
                    ],
                ];
            }
        }

        $name = trim((string) ($body['responder_name'] ?? '')) ?: null;
        $email = trim((string) ($body['responder_email'] ?? '')) ?: null;
        $phone = trim((string) ($body['responder_phone'] ?? '')) ?: null;
        if (!$name || !$email || !$phone) {
            $extracted = $this->extractContactFromResponses($fields, $responseData);
            $name = $name ?: $extracted['name'];
            $email = $email ?: $extracted['email'];
            $phone = $phone ?: $extracted['phone'];
        }

        try {
            $row = DB::selectOne(
                'INSERT INTO digital_form_responses
                    (profile_item_id, response_data, responder_name, responder_email, responder_phone, submitted_at, entry_mode)
                 VALUES (?, ?::jsonb, ?, ?, ?, NOW(), ?)
                 RETURNING id',
                [$id, json_encode($responseData, JSON_UNESCAPED_UNICODE), $name, $email, $phone, 'lead']
            );

            return [
                'status' => 201,
                'body' => [
                    'success' => true,
                    'message' => (string) ($formRow->success_message ?? 'Resposta enviada com sucesso!'),
                    'responseId' => $row->id ?? null,
                ],
            ];
        } catch (\Throwable $e) {
            try {
                $row = DB::selectOne(
                    'INSERT INTO digital_form_responses
                        (profile_item_id, response_data, responder_name, responder_email, responder_phone, submitted_at)
                     VALUES (?, ?::jsonb, ?, ?, ?, NOW())
                     RETURNING id',
                    [$id, json_encode($responseData, JSON_UNESCAPED_UNICODE), $name, $email, $phone]
                );

                return [
                    'status' => 201,
                    'body' => [
                        'success' => true,
                        'message' => (string) ($formRow->success_message ?? 'Resposta enviada com sucesso!'),
                        'responseId' => $row->id ?? null,
                    ],
                ];
            } catch (\Throwable $e2) {
                Log::error('form.submit', ['error' => $e2->getMessage()]);

                return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao salvar resposta.']];
            }
        }
    }

    /**
     * @param  list<array<string,mixed>>  $fields
     * @param  array<string,mixed>  $responseData
     * @return array{name:?string,email:?string,phone:?string}
     */
    private function extractContactFromResponses(array $fields, array $responseData): array
    {
        $name = null;
        $email = null;
        $phone = null;
        foreach ($fields as $field) {
            $fid = (string) ($field['id'] ?? '');
            if ($fid === '' || !array_key_exists($fid, $responseData)) {
                continue;
            }
            $raw = $responseData[$fid];
            $val = is_array($raw) ? implode(', ', array_map('strval', $raw)) : trim((string) $raw);
            if ($val === '') {
                continue;
            }
            $type = strtolower((string) ($field['type'] ?? ''));
            $label = strtolower((string) ($field['label'] ?? '').' '.$fid);
            if (!$name && in_array($type, ['short_text', 'text'], true) && preg_match('/nome|name/', $label)) {
                $name = $val;
            }
            if (!$email && ($type === 'email' || preg_match('/e-?mail/', $label))) {
                $email = $val;
            }
            if (!$phone && (in_array($type, ['phone', 'tel'], true) || preg_match('/telefone|whats|celular|fone/', $label))) {
                $phone = $val;
            }
        }

        return ['name' => $name, 'email' => $email, 'phone' => $phone];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array{status:int, view:string, data:array<string,mixed>, message?:string}
     */
    private function buildViewData(array $item): array
    {
        $itemId = (int) $item['id'];
        $form = DB::selectOne(
            'SELECT * FROM digital_form_items WHERE profile_item_id = ?
             ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
            [$itemId]
        );
        if (!$form) {
            return ['status' => 404, 'view' => '', 'data' => [], 'message' => 'Dados do formulário não encontrados.'];
        }
        $fd = (array) $form;
        if (isset($fd['form_fields']) && is_string($fd['form_fields'])) {
            $parsed = json_decode($fd['form_fields'], true);
            $fd['form_fields'] = is_array($parsed) ? $parsed : [];
        } elseif (!is_array($fd['form_fields'] ?? null)) {
            $fd['form_fields'] = [];
        }
        $slug = (string) ($item['profile_slug'] ?? '');
        $fieldsMeta = [];
        foreach ($fd['form_fields'] as $f) {
            if (!is_array($f)) {
                continue;
            }
            $fieldsMeta[] = [
                'id' => (string) ($f['id'] ?? ''),
                'type' => strtolower((string) ($f['type'] ?? 'short_text')),
                'label' => (string) ($f['label'] ?? ''),
                'required' => !empty($f['required']),
            ];
        }

        return [
            'status' => 200,
            'view' => 'cartao.form-public',
            'data' => [
                'item' => $item,
                'form' => $fd,
                'fieldsMeta' => $fieldsMeta,
                'slug' => $slug,
                'itemId' => $itemId,
                'submitUrl' => "/{$slug}/form/{$itemId}/submit",
            ],
        ];
    }
}
