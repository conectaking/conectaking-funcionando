<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Endpoint agregado de check-in: perfil + item + guest list + convidados + respostas
 * numa única chamada (porte de routes/checkin.routes.js).
 */
class CheckinAggregateService
{
    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function aggregate(int $itemId, string $userId): array
    {
        $profileItem = DB::selectOne(
            'SELECT id, item_type, title, user_id, is_active, display_order, created_at
             FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$itemId, $userId]
        );

        if (! $profileItem) {
            return ['status' => 404, 'body' => [
                'success' => false,
                'message' => 'Item não encontrado ou você não tem permissão para acessá-lo',
                'code' => 'PROFILE_ITEM_NOT_FOUND',
            ]];
        }

        $item = (array) $profileItem;
        $itemType = (string) ($item['item_type'] ?? '');

        $profile = DB::selectOne(
            'SELECT
                u.id, u.email, u.profile_slug,
                p.display_name, p.bio, p.profile_image_url,
                p.font_family,
                p.background_color, p.text_color, p.button_color, p.button_text_color,
                p.button_opacity, p.button_border_radius, p.button_content_align,
                p.background_type, p.background_image_url,
                p.card_background_color, p.card_opacity,
                p.button_font_size, p.background_image_opacity,
                p.show_vcard_button
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = ?',
            [$userId]
        );

        $guestList = null;
        $guests = [];
        if (($itemType === 'guest_list' || $itemType === 'digital_form') && Schema::hasTable('guest_list_items')) {
            $guestList = $this->fetchGuestList($itemId);
            if ($guestList !== null && ! empty($guestList['guest_list_item_id']) && Schema::hasTable('guests')) {
                $guests = $this->fetchGuests((int) $guestList['guest_list_item_id']);
            }
        }

        $responses = [];
        $digitalForm = null;
        if ($itemType === 'digital_form') {
            if (Schema::hasTable('digital_form_responses')) {
                $responses = $this->fetchResponses($itemId);
            }
            if (Schema::hasTable('digital_form_items')) {
                $digitalForm = $this->fetchDigitalForm($itemId);
            }
        }

        $item['digital_form_data'] = $digitalForm;
        $item['guest_list_data'] = $guestList;

        return ['status' => 200, 'body' => [
            'success' => true,
            'profile' => $profile ? (array) $profile : null,
            'item' => $item,
            'guestList' => $guestList,
            'guests' => $guests,
            'responses' => $responses,
        ]];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchGuestList(int $itemId): ?array
    {
        $row = DB::selectOne(
            "SELECT
                gli.id as guest_list_item_id,
                gli.event_title,
                gli.event_description,
                gli.event_date,
                gli.event_location,
                gli.registration_token,
                gli.confirmation_token,
                gli.public_view_token,
                gli.portaria_slug,
                gli.cadastro_slug,
                gli.cadastro_description,
                gli.cadastro_expires_at,
                gli.cadastro_max_uses,
                gli.cadastro_current_uses,
                gli.max_guests,
                gli.allow_self_registration,
                gli.require_confirmation,
                gli.custom_form_fields,
                gli.use_custom_form,
                COALESCE(gli.primary_color, '#FFC700') as primary_color,
                COALESCE(gli.text_color, '#ECECEC') as text_color,
                COALESCE(gli.background_color, '#0D0D0F') as background_color,
                gli.secondary_color,
                gli.header_image_url,
                gli.background_image_url,
                COALESCE(gli.background_opacity, 1.0) as background_opacity,
                COALESCE(gli.theme, 'dark') as theme
             FROM guest_list_items gli
             WHERE gli.profile_item_id = ?",
            [$itemId]
        );

        if (! $row) {
            return null;
        }

        $guestList = (array) $row;
        $guestList['custom_form_fields'] = $this->decodeJson($guestList['custom_form_fields'] ?? null, []);

        return $guestList;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function fetchGuests(int $guestListId): array
    {
        $rows = DB::select(
            'SELECT
                id, name, email, phone, document, status,
                registered_at, confirmed_at, checked_in_at,
                custom_data, notes
             FROM guests
             WHERE guest_list_id = ?
             ORDER BY registered_at DESC',
            [$guestListId]
        );

        return array_map(function ($row): array {
            $guest = (array) $row;
            $guest['custom_data'] = $this->decodeJson($guest['custom_data'] ?? null, null);

            return $guest;
        }, $rows);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function fetchResponses(int $itemId): array
    {
        $rows = DB::select(
            'SELECT
                id, response_data, submitted_at, responder_name, responder_email, responder_phone
             FROM digital_form_responses
             WHERE profile_item_id = ?
             ORDER BY submitted_at DESC',
            [$itemId]
        );

        return array_map(function ($row): array {
            $response = (array) $row;
            $response['response_data'] = $this->decodeJson($response['response_data'] ?? null, null);

            return $response;
        }, $rows);
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchDigitalForm(int $itemId): ?array
    {
        $row = DB::selectOne(
            'SELECT
                dfi.id as digital_form_item_id,
                dfi.form_title,
                dfi.form_description,
                dfi.form_fields,
                dfi.share_token,
                dfi.require_email,
                dfi.require_phone,
                dfi.button_text,
                dfi.success_message,
                dfi.redirect_url,
                dfi.email_notifications,
                dfi.notification_emails
             FROM digital_form_items dfi
             WHERE dfi.profile_item_id = ?',
            [$itemId]
        );

        if (! $row) {
            return null;
        }

        $digitalForm = (array) $row;
        $digitalForm['form_fields'] = $this->decodeJson($digitalForm['form_fields'] ?? null, []);

        return $digitalForm;
    }

    private function decodeJson(mixed $v, mixed $default): mixed
    {
        if ($v === null) {
            return $default;
        }
        if (is_array($v)) {
            return $v;
        }
        if (is_string($v)) {
            $d = json_decode($v, true);

            return json_last_error() === JSON_ERROR_NONE ? $d : $default;
        }

        return $v;
    }
}
