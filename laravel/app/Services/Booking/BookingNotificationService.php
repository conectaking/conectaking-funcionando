<?php

namespace App\Services\Booking;

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BookingNotificationService
{
    /**
     * Envia notificações sobre novo agendamento realizado.
     */
    public function notifyNewAppointment(object $appointment): void
    {
        $dateFormatted = Carbon::parse($appointment->appointment_date)->format('d/m/Y');
        $timeStart = substr((string) $appointment->start_time, 0, 5);
        $timeEnd = substr((string) $appointment->end_time, 0, 5);
        $price = number_format((float) ($appointment->price ?? 0), 2, ',', '.');
        $businessName = $appointment->business_name ?: $appointment->business_owner_name ?: 'Estabelecimento';
        $serviceName = $appointment->service_name;
        $clientName = $appointment->client_name;
        $clientPhone = $appointment->client_phone;
        $profName = $appointment->professional_name ? " (Profissional: {$appointment->professional_name})" : "";

        // 1. Mensagem para o Dono do Negócio (Telegram / WhatsApp)
        $ownerMsg = "💈 *Novo Agendamento Recebido!*\n\n"
            . "🏢 *Local:* {$businessName}\n"
            . "👤 *Cliente:* {$clientName}\n"
            . "📱 *WhatsApp:* {$clientPhone}\n"
            . "✂️ *Serviço:* {$serviceName}{$profName}\n"
            . "📅 *Data:* {$dateFormatted}\n"
            . "⏰ *Horário:* {$timeStart} às {$timeEnd}\n"
            . "💰 *Valor:* R$ {$price}\n";

        if (!empty($appointment->notes)) {
            $ownerMsg .= "📝 *Obs:* {$appointment->notes}\n";
        }

        $this->sendAlertWebhook([
            'event' => 'booking.new',
            'type' => 'booking',
            'business_name' => $businessName,
            'client_name' => $clientName,
            'client_phone' => $clientPhone,
            'owner_phone' => $appointment->owner_phone ?? $appointment->business_phone ?? null,
            'service_name' => $serviceName,
            'appointment_date' => $dateFormatted,
            'start_time' => $timeStart,
            'end_time' => $timeEnd,
            'price' => $price,
            'message' => $ownerMsg,
        ]);
    }

    /**
     * Notifica atualização de status (ex: confirmação ou cancelamento).
     */
    public function notifyStatusUpdate(object $appointment, string $status): void
    {
        $dateFormatted = Carbon::parse($appointment->appointment_date)->format('d/m/Y');
        $timeStart = substr((string) $appointment->start_time, 0, 5);
        $businessName = $appointment->business_name ?: 'Estabelecimento';
        $serviceName = $appointment->service_name;

        $statusText = $status === 'confirmed' ? '✅ Confirmado' : '❌ Cancelado';

        $msg = "📅 *Atualização de Agendamento ({$statusText})*\n\n"
            . "🏢 *Local:* {$businessName}\n"
            . "✂️ *Serviço:* {$serviceName}\n"
            . "👤 *Cliente:* {$appointment->client_name}\n"
            . "📅 *Data:* {$dateFormatted} às {$timeStart}\n";

        if ($status === 'cancelled' && !empty($appointment->cancelled_reason)) {
            $msg .= "⚠️ *Motivo:* {$appointment->cancelled_reason}\n";
        }

        $this->sendAlertWebhook([
            'event' => 'booking.status_updated',
            'status' => $status,
            'message' => $msg,
            'client_phone' => $appointment->client_phone,
            'owner_phone' => $appointment->owner_phone ?? null,
        ]);
    }

    /**
     * Dispara webhook para n8n / Evolution API
     */
    private function sendAlertWebhook(array $payload): void
    {
        $webhookUrl = env('CK_BOOKING_NOTIFICATION_WEBHOOK')
            ?: env('CK_AGENT_ALERT_WEBHOOK')
            ?: env('CK_FORMS_NOTIFICATION_WEBHOOK');

        if (!$webhookUrl) {
            return;
        }

        try {
            Http::timeout(5)->post($webhookUrl, $payload);
        } catch (\Throwable $e) {
            Log::warning('booking.webhook_failed', [
                'error' => $e->getMessage(),
                'url' => $webhookUrl,
            ]);
        }
    }
}
