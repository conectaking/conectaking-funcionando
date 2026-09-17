<?php

namespace App\Services\Booking;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingService
{
    /**
     * Retorna configurações do módulo de agendamento do usuário (ou cria padrão se não existir).
     */
    public function getSettings(int $userId): object
    {
        $settings = DB::selectOne("SELECT * FROM booking_settings WHERE user_id = ?", [$userId]);

        if (!$settings) {
            DB::insert("
                INSERT INTO booking_settings (user_id, business_name, created_at, updated_at)
                VALUES (?, (SELECT name FROM users WHERE id = ?), NOW(), NOW())
            ", [$userId, $userId]);
            $settings = DB::selectOne("SELECT * FROM booking_settings WHERE user_id = ?", [$userId]);
        }

        if (is_string($settings->working_hours)) {
            $settings->working_hours = json_decode($settings->working_hours, true) ?? [];
        }

        return $settings;
    }

    /**
     * Salva as configurações de agendamento.
     */
    public function saveSettings(int $userId, array $data): object
    {
        $this->getSettings($userId); // Garante que existe

        $workingHours = is_array($data['working_hours'] ?? null)
            ? json_encode($data['working_hours'])
            : ($data['working_hours'] ?? null);

        DB::update("
            UPDATE booking_settings
            SET business_name = COALESCE(?, business_name),
                business_phone = COALESCE(?, business_phone),
                business_address = COALESCE(?, business_address),
                slot_interval_minutes = COALESCE(?, slot_interval_minutes),
                min_notice_hours = COALESCE(?, min_notice_hours),
                max_days_advance = COALESCE(?, max_days_advance),
                auto_confirm = COALESCE(?, auto_confirm),
                notify_whatsapp = COALESCE(?, notify_whatsapp),
                notify_telegram = COALESCE(?, notify_telegram),
                working_hours = COALESCE(?::jsonb, working_hours),
                is_active = COALESCE(?, is_active),
                updated_at = NOW()
            WHERE user_id = ?
        ", [
            $data['business_name'] ?? null,
            $data['business_phone'] ?? null,
            $data['business_address'] ?? null,
            isset($data['slot_interval_minutes']) ? (int) $data['slot_interval_minutes'] : null,
            isset($data['min_notice_hours']) ? (int) $data['min_notice_hours'] : null,
            isset($data['max_days_advance']) ? (int) $data['max_days_advance'] : null,
            isset($data['auto_confirm']) ? (bool) $data['auto_confirm'] : null,
            isset($data['notify_whatsapp']) ? (bool) $data['notify_whatsapp'] : null,
            isset($data['notify_telegram']) ? (bool) $data['notify_telegram'] : null,
            $workingHours,
            isset($data['is_active']) ? (bool) $data['is_active'] : null,
            $userId,
        ]);

        return $this->getSettings($userId);
    }

    /**
     * Lista os serviços ativos do usuário.
     */
    public function getServices(int $userId, bool $onlyActive = false): array
    {
        $where = $onlyActive ? "AND is_active = TRUE" : "";
        return DB::select("
            SELECT * FROM booking_services
            WHERE user_id = ? {$where}
            ORDER BY sort_order ASC, name ASC
        ", [$userId]);
    }

    /**
     * Salva ou atualiza um serviço.
     */
    public function saveService(int $userId, array $data, ?int $serviceId = null): object
    {
        $name = trim((string) ($data['name'] ?? ''));
        $description = trim((string) ($data['description'] ?? '')) ?: null;
        $duration = max(5, (int) ($data['duration_minutes'] ?? 30));
        $price = (float) ($data['price'] ?? 0);
        $isActive = isset($data['is_active']) ? (bool) $data['is_active'] : true;
        $sortOrder = (int) ($data['sort_order'] ?? 0);

        if ($serviceId) {
            DB::update("
                UPDATE booking_services
                SET name = ?, description = ?, duration_minutes = ?, price = ?, is_active = ?, sort_order = ?, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            ", [$name, $description, $duration, $price, $isActive, $sortOrder, $serviceId, $userId]);
        } else {
            $serviceId = DB::table('booking_services')->insertGetId([
                'user_id' => $userId,
                'name' => $name,
                'description' => $description,
                'duration_minutes' => $duration,
                'price' => $price,
                'is_active' => $isActive,
                'sort_order' => $sortOrder,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return DB::selectOne("SELECT * FROM booking_services WHERE id = ?", [$serviceId]);
    }

    /**
     * Exclui um serviço.
     */
    public function deleteService(int $userId, int $serviceId): bool
    {
        return DB::delete("DELETE FROM booking_services WHERE id = ? AND user_id = ?", [$serviceId, $userId]) > 0;
    }

    /**
     * Lista profissionais cadastrados.
     */
    public function getProfessionals(int $userId, bool $onlyActive = false): array
    {
        $where = $onlyActive ? "AND is_active = TRUE" : "";
        return DB::select("
            SELECT * FROM booking_professionals
            WHERE user_id = ? {$where}
            ORDER BY sort_order ASC, name ASC
        ", [$userId]);
    }

    /**
     * Salva ou atualiza um profissional.
     */
    public function saveProfessional(int $userId, array $data, ?int $profId = null): object
    {
        $name = trim((string) ($data['name'] ?? ''));
        $avatarUrl = trim((string) ($data['avatar_url'] ?? '')) ?: null;
        $phone = trim((string) ($data['phone'] ?? '')) ?: null;
        $isActive = isset($data['is_active']) ? (bool) $data['is_active'] : true;
        $sortOrder = (int) ($data['sort_order'] ?? 0);

        if ($profId) {
            DB::update("
                UPDATE booking_professionals
                SET name = ?, avatar_url = ?, phone = ?, is_active = ?, sort_order = ?, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            ", [$name, $avatarUrl, $phone, $isActive, $sortOrder, $profId, $userId]);
        } else {
            $profId = DB::table('booking_professionals')->insertGetId([
                'user_id' => $userId,
                'name' => $name,
                'avatar_url' => $avatarUrl,
                'phone' => $phone,
                'is_active' => $isActive,
                'sort_order' => $sortOrder,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return DB::selectOne("SELECT * FROM booking_professionals WHERE id = ?", [$profId]);
    }

    /**
     * Exclui um profissional.
     */
    public function deleteProfessional(int $userId, int $profId): bool
    {
        return DB::delete("DELETE FROM booking_professionals WHERE id = ? AND user_id = ?", [$profId, $userId]) > 0;
    }

    /**
     * Calcula os horários disponíveis (slots livres) para um determinado dia e serviço.
     */
    public function getAvailableSlots(int $userId, string $dateStr, int $durationMinutes, ?int $profId = null): array
    {
        $settings = $this->getSettings($userId);
        if (!$settings->is_active) {
            return [];
        }

        $targetDate = Carbon::parse($dateStr, 'America/Sao_Paulo');
        $now = Carbon::now('America/Sao_Paulo');

        // Valida se a data não está no passado
        if ($targetDate->format('Y-m-d') < $now->format('Y-m-d')) {
            return [];
        }

        // Valida antecedência máxima
        $maxDays = max(1, (int) $settings->max_days_advance);
        if ($targetDate->diffInDays($now, false) < -$maxDays) {
            return [];
        }

        // Dia da semana: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        $dayOfWeek = (string) $targetDate->dayOfWeek;
        $workingHours = $settings->working_hours[$dayOfWeek] ?? null;

        if (!$workingHours || empty($workingHours['enabled'])) {
            return []; // Estabelecimento fechado neste dia
        }

        $startTimeStr = $workingHours['start'] ?? '09:00';
        $endTimeStr = $workingHours['end'] ?? '18:00';
        $breakStartStr = $workingHours['break_start'] ?? null;
        $breakEndStr = $workingHours['break_end'] ?? null;

        $slotInterval = max(15, (int) $settings->slot_interval_minutes);
        $minNoticeHours = (int) $settings->min_notice_hours;
        $earliestAllowedTime = (clone $now)->addHours($minNoticeHours);

        // Busca agendamentos existentes no dia (exceto cancelados)
        $profCondition = $profId ? "AND (professional_id = ? OR professional_id IS NULL)" : "";
        $params = $profId ? [$userId, $targetDate->format('Y-m-d'), $profId] : [$userId, $targetDate->format('Y-m-d')];

        $bookedAppointments = DB::select("
            SELECT start_time, end_time, professional_id
            FROM booking_appointments
            WHERE user_id = ?
              AND appointment_date = ?
              AND status != 'cancelled'
              {$profCondition}
        ", $params);

        $slots = [];
        $current = Carbon::parse($targetDate->format('Y-m-d') . ' ' . $startTimeStr, 'America/Sao_Paulo');
        $dayEnd = Carbon::parse($targetDate->format('Y-m-d') . ' ' . $endTimeStr, 'America/Sao_Paulo');

        while ($current->copy()->addMinutes($durationMinutes)->lte($dayEnd)) {
            $slotStart = $current->copy();
            $slotEnd = $current->copy()->addMinutes($durationMinutes);

            // Verifica antecedência mínima se for hoje
            if ($targetDate->isToday() && $slotStart->lt($earliestAllowedTime)) {
                $current->addMinutes($slotInterval);
                continue;
            }

            // Verifica se colide com intervalo de almoço
            $collidesBreak = false;
            if ($breakStartStr && $breakEndStr) {
                $breakStart = Carbon::parse($targetDate->format('Y-m-d') . ' ' . $breakStartStr, 'America/Sao_Paulo');
                $breakEnd = Carbon::parse($targetDate->format('Y-m-d') . ' ' . $breakEndStr, 'America/Sao_Paulo');

                if ($slotStart->lt($breakEnd) && $slotEnd->gt($breakStart)) {
                    $collidesBreak = true;
                }
            }

            if (!$collidesBreak) {
                // Verifica se colide com algum agendamento já marcado
                $hasCollision = false;
                foreach ($bookedAppointments as $booked) {
                    $bStart = Carbon::parse($targetDate->format('Y-m-d') . ' ' . $booked->start_time, 'America/Sao_Paulo');
                    $bEnd = Carbon::parse($targetDate->format('Y-m-d') . ' ' . $booked->end_time, 'America/Sao_Paulo');

                    if ($slotStart->lt($bEnd) && $slotEnd->gt($bStart)) {
                        $hasCollision = true;
                        break;
                    }
                }

                if (!$hasCollision) {
                    $slots[] = [
                        'time' => $slotStart->format('H:i'),
                        'time_end' => $slotEnd->format('H:i'),
                        'label' => $slotStart->format('H:i'),
                    ];
                }
            }

            $current->addMinutes($slotInterval);
        }

        return $slots;
    }

    /**
     * Cria um novo agendamento validando conflitos.
     */
    public function createAppointment(int $userId, array $data): object
    {
        $serviceId = (int) ($data['service_id'] ?? 0);
        $service = DB::selectOne("SELECT * FROM booking_services WHERE id = ? AND user_id = ? AND is_active = TRUE", [$serviceId, $userId]);
        if (!$service) {
            throw new \InvalidArgumentException("Serviço não encontrado ou inativo.");
        }

        $clientName = trim((string) ($data['client_name'] ?? ''));
        $clientPhone = preg_replace('/\D/', '', (string) ($data['client_phone'] ?? ''));
        $clientEmail = trim((string) ($data['client_email'] ?? '')) ?: null;
        $dateStr = trim((string) ($data['appointment_date'] ?? ''));
        $timeStr = trim((string) ($data['start_time'] ?? ''));
        $profId = !empty($data['professional_id']) ? (int) $data['professional_id'] : null;
        $notes = trim((string) ($data['notes'] ?? '')) ?: null;

        if (empty($clientName) || strlen($clientPhone) < 10 || empty($dateStr) || empty($timeStr)) {
            throw new \InvalidArgumentException("Por favor, preencha todos os campos obrigatórios (Nome, WhatsApp, Data e Horário).");
        }

        $duration = (int) $service->duration_minutes;
        $startTime = Carbon::parse("{$dateStr} {$timeStr}", 'America/Sao_Paulo');
        $endTime = (clone $startTime)->addMinutes($duration);

        // Valida se horário ainda está livre
        $conflict = DB::selectOne("
            SELECT id FROM booking_appointments
            WHERE user_id = ?
              AND appointment_date = ?
              AND status != 'cancelled'
              AND (
                  (start_time < ? AND end_time > ?)
                  OR (start_time >= ? AND start_time < ?)
              )
              " . ($profId ? "AND (professional_id = ? OR professional_id IS NULL)" : "") . "
        ", $profId ? [
            $userId, $dateStr,
            $endTime->format('H:i:s'), $startTime->format('H:i:s'),
            $startTime->format('H:i:s'), $endTime->format('H:i:s'),
            $profId
        ] : [
            $userId, $dateStr,
            $endTime->format('H:i:s'), $startTime->format('H:i:s'),
            $startTime->format('H:i:s'), $endTime->format('H:i:s')
        ]);

        if ($conflict) {
            throw new \RuntimeException("Este horário acabou de ser reservado. Por favor, selecione outro horário disponível.");
        }

        $settings = $this->getSettings($userId);
        $status = $settings->auto_confirm ? 'confirmed' : 'pending';

        $appointmentId = DB::table('booking_appointments')->insertGetId([
            'user_id' => $userId,
            'service_id' => $service->id,
            'professional_id' => $profId,
            'client_name' => $clientName,
            'client_phone' => $clientPhone,
            'client_email' => $clientEmail,
            'appointment_date' => $dateStr,
            'start_time' => $startTime->format('H:i:s'),
            'end_time' => $endTime->format('H:i:s'),
            'price' => $service->price,
            'status' => $status,
            'notes' => $notes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $appointment = $this->getAppointmentById($userId, $appointmentId);

        // Disparo de notificações
        try {
            app(BookingNotificationService::class)->notifyNewAppointment($appointment);
        } catch (\Throwable $e) {
            Log::warning('booking.notify_failed', ['error' => $e->getMessage()]);
        }

        return $appointment;
    }

    /**
     * Busca agendamento por ID com joins.
     */
    public function getAppointmentById(int $userId, int $appointmentId): ?object
    {
        return DB::selectOne("
            SELECT a.*,
                   s.name AS service_name,
                   s.duration_minutes,
                   p.name AS professional_name,
                   p.avatar_url AS professional_avatar,
                   u.name AS business_owner_name,
                   u.notification_phone AS owner_phone,
                   u.email AS owner_email,
                   cfg.business_name,
                   cfg.business_phone,
                   cfg.business_address
            FROM booking_appointments a
            JOIN booking_services s ON s.id = a.service_id
            JOIN users u ON u.id = a.user_id
            LEFT JOIN booking_professionals p ON p.id = a.professional_id
            LEFT JOIN booking_settings cfg ON cfg.user_id = a.user_id
            WHERE a.id = ? AND a.user_id = ?
        ", [$appointmentId, $userId]);
    }

    /**
     * Lista agendamentos com filtros para o painel administrativo.
     */
    public function getAppointments(int $userId, array $filters = []): array
    {
        $where = ["a.user_id = ?"];
        $params = [$userId];

        if (!empty($filters['date'])) {
            $where[] = "a.appointment_date = ?";
            $params[] = $filters['date'];
        }

        if (!empty($filters['status'])) {
            $where[] = "a.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $where[] = "a.appointment_date BETWEEN ? AND ?";
            $params[] = $filters['start_date'];
            $params[] = $filters['end_date'];
        }

        $whereSql = implode(' AND ', $where);

        return DB::select("
            SELECT a.*,
                   s.name AS service_name,
                   s.duration_minutes,
                   p.name AS professional_name
            FROM booking_appointments a
            JOIN booking_services s ON s.id = a.service_id
            LEFT JOIN booking_professionals p ON p.id = a.professional_id
            WHERE {$whereSql}
            ORDER BY a.appointment_date ASC, a.start_time ASC
        ", $params);
    }

    /**
     * Atualiza o status de um agendamento (ex: 'confirmed', 'completed', 'cancelled').
     */
    public function updateStatus(int $userId, int $appointmentId, string $status, ?string $reason = null): ?object
    {
        $validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses, true)) {
            throw new \InvalidArgumentException("Status inválido.");
        }

        DB::update("
            UPDATE booking_appointments
            SET status = ?,
                cancelled_reason = CASE WHEN ? = 'cancelled' THEN ? ELSE cancelled_reason END,
                updated_at = NOW()
            WHERE id = ? AND user_id = ?
        ", [$status, $status, $reason, $appointmentId, $userId]);

        $appointment = $this->getAppointmentById($userId, $appointmentId);

        // Se cancelado ou confirmado, pode disparar notificação
        if ($appointment && in_array($status, ['confirmed', 'cancelled'], true)) {
            try {
                app(BookingNotificationService::class)->notifyStatusUpdate($appointment, $status);
            } catch (\Throwable $e) {
                Log::warning('booking.notify_status_failed', ['error' => $e->getMessage()]);
            }
        }

        return $appointment;
    }
}
