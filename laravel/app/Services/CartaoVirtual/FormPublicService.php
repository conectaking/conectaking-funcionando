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
            "SELECT pi.id, pi.item_type, u.profile_slug
             FROM profile_items pi
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
            'SELECT form_fields, enable_whatsapp, enable_guest_list_submit, send_mode, whatsapp_number
             FROM digital_form_items WHERE profile_item_id = ?
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

        $cfg = $this->resolveSubmitConfig($formRow, (string) ($item->item_type ?? ''), $id);
        $guestId = null;
        $qrToken = null;

        if ($cfg['save_guest']) {
            $guest = $this->insertGuestFromForm($id, $responseData, $name, $email, $phone);
            if ($guest) {
                $guestId = $guest['id'];
                $qrToken = $guest['qr_token'];
            }
        }

        $entryMode = $cfg['send_mode'] === 'checkin' ? 'checkin' : 'lead';
        $responseId = $this->insertFormResponse($id, $responseData, $name, $email, $phone, $guestId, $entryMode, null);
        if ($responseId === null && $cfg['send_mode'] !== 'whatsapp-only') {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao salvar resposta.']];
        }

        $profileSlug = (string) ($item->profile_slug ?: $slug);
        // Sem PagBank/checkout: sempre página de sucesso (check-in/QR quando aplicável)
        $successPageUrl = null;
        if ($cfg['send_mode'] !== 'whatsapp-only') {
            $successPageUrl = "/{$profileSlug}/form/{$id}/success?response_id=".($responseId ?? '').'&show_success_page=true';
        }

        $message = $cfg['send_mode'] === 'whatsapp-only'
            ? 'Enviado via WhatsApp'
            : 'Resposta salva com sucesso';

        return [
            'status' => 201,
            'body' => [
                'success' => true,
                'message' => $message,
                'responseId' => $responseId,
                'response_id' => $responseId,
                'success_page_url' => $successPageUrl,
                'checkout_enabled' => false,
                'guest_id' => $guestId,
                'qr_token' => $qrToken,
                'should_show_guest_list_info' => $cfg['save_guest'],
                'send_mode' => $cfg['send_mode'],
                'enable_whatsapp' => $cfg['whatsapp'],
                'whatsapp_number' => $cfg['whatsapp_number'],
            ],
        ];
    }

    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    public function successPage(string $slug, string $itemId, ?string $responseId): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'message' => 'ID inválido.'];
        }
        $id = (int) $itemId;
        $item = DB::selectOne(
            "SELECT pi.id, u.profile_slug
             FROM profile_items pi
             JOIN users u ON u.id = pi.user_id
             WHERE pi.id = ? AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active = true
               AND (u.profile_slug = ? OR u.id = ?)
             LIMIT 1",
            [$id, $slug, $slug]
        );
        if (!$item) {
            return ['status' => 404, 'message' => 'Formulário não encontrado.'];
        }

        $form = DB::selectOne(
            'SELECT form_title, primary_color, secondary_color, background_color,
                    enable_whatsapp, whatsapp_number, enable_guest_list_submit, send_mode
             FROM digital_form_items WHERE profile_item_id = ?
             ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
            [$id]
        );

        $qrToken = null;
        $guestId = null;
        $guestName = null;
        if ($responseId && ctype_digit($responseId)) {
            $resp = DB::selectOne(
                'SELECT id, guest_id, responder_name FROM digital_form_responses
                 WHERE id = ? AND profile_item_id = ? LIMIT 1',
                [(int) $responseId, $id]
            );
            if ($resp && !empty($resp->guest_id)) {
                $guestId = (int) $resp->guest_id;
                $guestName = $resp->responder_name ?? null;
                $guest = DB::selectOne('SELECT qr_token, name FROM guests WHERE id = ? LIMIT 1', [$guestId]);
                if ($guest) {
                    $qrToken = $guest->qr_token ?? null;
                    $guestName = $guest->name ?? $guestName;
                }
            }
        }

        $sendMode = strtolower((string) ($form->send_mode ?? 'lead'));
        if ($sendMode === 'system-only') {
            $sendMode = 'checkin';
        }
        $showQr = $qrToken && (
            $sendMode === 'checkin'
            || !empty($form->enable_guest_list_submit)
            || $guestId
        );

        return [
            'status' => 200,
            'view' => 'cartao.form-success',
            'data' => [
                'title' => 'Enviado!',
                'message' => 'Resposta enviada com sucesso!',
                'formTitle' => (string) ($form->form_title ?? 'Formulário'),
                'backUrl' => "/{$slug}/form/{$id}",
                'primaryColor' => (string) ($form->primary_color ?? '#FFC700'),
                'secondaryColor' => (string) ($form->secondary_color ?? ($form->primary_color ?? '#FFB700')),
                'backgroundColor' => (string) ($form->background_color ?? '#0D0D0F'),
                'showQr' => $showQr,
                'qrToken' => $qrToken,
                'guestId' => $guestId,
                'guestName' => $guestName,
                'showWhatsapp' => ($form->enable_whatsapp ?? true) && !empty($form->whatsapp_number),
                'whatsappNumber' => (string) ($form->whatsapp_number ?? ''),
            ],
        ];
    }

    /**
     * @return array{send_mode:string,save_guest:bool,whatsapp:bool,whatsapp_number:?string}
     */
    private function resolveSubmitConfig(?object $formRow, string $itemType, int $profileItemId): array
    {
        $enableGuest = false;
        $enableWhatsapp = true;
        $sendMode = 'lead';
        $whatsappNumber = null;

        if ($formRow) {
            $enableGuest = in_array($formRow->enable_guest_list_submit ?? false, [true, 'true', 1, '1'], true);
            $enableWhatsapp = !in_array($formRow->enable_whatsapp ?? true, [false, 'false', 0, '0'], true);
            $whatsappNumber = !empty($formRow->whatsapp_number) ? (string) $formRow->whatsapp_number : null;
            $dbMode = strtolower((string) ($formRow->send_mode ?? 'lead'));
            if ($dbMode === 'system-only') {
                $dbMode = 'checkin';
            }
            if ($dbMode === 'both' || $dbMode === 'whatsapp-only') {
                $dbMode = 'lead';
            }
            if ($dbMode === 'checkin' || $enableGuest) {
                $sendMode = 'checkin';
                $enableGuest = true;
            }
        }

        $saveGuest = false;
        if ($enableGuest || $itemType === 'guest_list') {
            $gli = DB::selectOne('SELECT id FROM guest_list_items WHERE profile_item_id = ? LIMIT 1', [$profileItemId]);
            $saveGuest = (bool) $gli;
            if ($itemType === 'guest_list' && !$enableGuest) {
                $saveGuest = false;
            }
            if ($enableGuest && $gli) {
                $saveGuest = true;
                $sendMode = 'checkin';
            }
        }

        return [
            'send_mode' => $sendMode,
            'save_guest' => $saveGuest,
            'whatsapp' => $enableWhatsapp,
            'whatsapp_number' => $whatsappNumber,
        ];
    }

    /**
     * @param  array<string,mixed>  $responseData
     * @return array{id:int,qr_token:string}|null
     */
    private function insertGuestFromForm(int $profileItemId, array $responseData, ?string $name, ?string $email, ?string $phone): ?array
    {
        $gli = DB::selectOne('SELECT id FROM guest_list_items WHERE profile_item_id = ? LIMIT 1', [$profileItemId]);
        if (!$gli) {
            return null;
        }

        $guestName = $name
            ?: $this->pickResponse($responseData, ['name', 'nome', 'Nome completo', 'nome_completo'])
            ?: 'Visitante';
        $whatsapp = $phone
            ?: $this->pickResponse($responseData, ['whatsapp', 'phone', 'telefone', 'Telefone/WhatsApp'])
            ?: '';
        $guestEmail = $email ?: $this->pickResponse($responseData, ['email', 'Email']);
        $document = $this->pickResponse($responseData, ['document', 'cpf', 'cnpj', 'CPF', 'CNPJ']);
        if ($document) {
            $document = preg_replace('/[.\-\s]/', '', $document);
        }
        $qrToken = bin2hex(random_bytes(32));

        try {
            $row = DB::selectOne(
                'INSERT INTO guests (
                    guest_list_id, name, email, phone, whatsapp, document,
                    address, neighborhood, city, state, zipcode, instagram,
                    status, registration_source, custom_responses, qr_token, qr_code_generated_at, entry_mode
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'registered\', \'form\', ?::jsonb, ?, NOW(), \'checkin\')
                 RETURNING id, qr_token',
                [
                    $gli->id,
                    trim($guestName),
                    $guestEmail,
                    $this->pickResponse($responseData, ['phone', 'telefone', 'Telefone']),
                    $whatsapp !== '' ? $whatsapp : null,
                    $document,
                    $this->pickResponse($responseData, ['address', 'endereco', 'Endereço', 'Endereço completo']),
                    $this->pickResponse($responseData, ['neighborhood', 'bairro', 'Bairro']),
                    $this->pickResponse($responseData, ['city', 'cidade', 'Cidade']),
                    $this->pickResponse($responseData, ['state', 'estado', 'Estado']),
                    $this->pickResponse($responseData, ['zipcode', 'cep', 'CEP']),
                    $this->pickResponse($responseData, ['instagram', 'Instagram']),
                    json_encode($responseData, JSON_UNESCAPED_UNICODE),
                    $qrToken,
                ]
            );
        } catch (\Throwable $e) {
            try {
                $row = DB::selectOne(
                    'INSERT INTO guests (
                        guest_list_id, name, email, phone, whatsapp, document,
                        status, registration_source, custom_responses, qr_token, qr_code_generated_at
                     ) VALUES (?, ?, ?, ?, ?, ?, \'registered\', \'form\', ?::jsonb, ?, NOW())
                     RETURNING id, qr_token',
                    [
                        $gli->id,
                        trim($guestName),
                        $guestEmail,
                        null,
                        $whatsapp !== '' ? $whatsapp : null,
                        $document,
                        json_encode($responseData, JSON_UNESCAPED_UNICODE),
                        $qrToken,
                    ]
                );
            } catch (\Throwable $e2) {
                Log::error('form.submit.guest', ['error' => $e2->getMessage()]);

                return null;
            }
        }

        if (!$row) {
            return null;
        }

        return ['id' => (int) $row->id, 'qr_token' => (string) ($row->qr_token ?: $qrToken)];
    }

    /**
     * @param  array<string,mixed>  $responseData
     */
    private function insertFormResponse(
        int $id,
        array $responseData,
        ?string $name,
        ?string $email,
        ?string $phone,
        ?int $guestId,
        string $entryMode,
        ?string $paymentStatus
    ): ?int {
        $json = json_encode($responseData, JSON_UNESCAPED_UNICODE);
        $attempts = [];
        if ($paymentStatus !== null) {
            $attempts[] = function () use ($id, $json, $name, $email, $phone, $guestId, $entryMode, $paymentStatus) {
                return DB::selectOne(
                    'INSERT INTO digital_form_responses
                        (profile_item_id, response_data, responder_name, responder_email, responder_phone,
                         guest_id, payment_status, entry_mode, submitted_at)
                     VALUES (?, ?::jsonb, ?, ?, ?, ?, ?::payment_status_enum, ?, NOW())
                     RETURNING id',
                    [$id, $json, $name, $email, $phone, $guestId, $paymentStatus, $entryMode]
                );
            };
        }
        $attempts[] = function () use ($id, $json, $name, $email, $phone, $guestId, $entryMode) {
            return DB::selectOne(
                'INSERT INTO digital_form_responses
                    (profile_item_id, response_data, responder_name, responder_email, responder_phone,
                     guest_id, entry_mode, submitted_at)
                 VALUES (?, ?::jsonb, ?, ?, ?, ?, ?, NOW())
                 RETURNING id',
                [$id, $json, $name, $email, $phone, $guestId, $entryMode]
            );
        };
        $attempts[] = function () use ($id, $json, $name, $email, $phone, $entryMode) {
            return DB::selectOne(
                'INSERT INTO digital_form_responses
                    (profile_item_id, response_data, responder_name, responder_email, responder_phone,
                     entry_mode, submitted_at)
                 VALUES (?, ?::jsonb, ?, ?, ?, ?, NOW())
                 RETURNING id',
                [$id, $json, $name, $email, $phone, $entryMode]
            );
        };
        $attempts[] = function () use ($id, $json, $name, $email, $phone) {
            return DB::selectOne(
                'INSERT INTO digital_form_responses
                    (profile_item_id, response_data, responder_name, responder_email, responder_phone, submitted_at)
                 VALUES (?, ?::jsonb, ?, ?, ?, NOW())
                 RETURNING id',
                [$id, $json, $name, $email, $phone]
            );
        };

        foreach ($attempts as $attempt) {
            try {
                $row = $attempt();
                if ($row && isset($row->id)) {
                    return (int) $row->id;
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        Log::error('form.submit.response', ['item' => $id]);

        return null;
    }

    /**
     * @param  array<string,mixed>  $data
     * @param  list<string>  $keys
     */
    private function pickResponse(array $data, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $raw = $data[$key];
            $val = is_array($raw) ? implode(', ', array_map('strval', $raw)) : trim((string) $raw);
            if ($val !== '') {
                return $val;
            }
        }

        return null;
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
