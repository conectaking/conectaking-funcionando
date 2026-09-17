<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona campos de contato para notificações proativas (Telegram/WhatsApp) na tabela users.
 *
 * - notification_phone: número do WhatsApp/Telegram do usuário (com DDI, ex: 5511999998888)
 * - notification_email: e-mail alternativo para alertas (independente do e-mail de login)
 *
 * Usados por:
 *   - FinanceNotificationService (lembretes de contas a vencer)
 *   - KingSelectionNotificationService (alerta de seleção concluída)
 *   - KingFormsNotificationService (alerta de novo lead)
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            // Telefone/WhatsApp para notificações proativas (ex: "5511999998888")
            DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_phone VARCHAR(30) NULL');
            // E-mail alternativo para notificações proativas
            DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255) NULL');
            // Índice para queries de notificação eficientes
            DB::statement('CREATE INDEX IF NOT EXISTS idx_users_notification_phone ON users(notification_phone) WHERE notification_phone IS NOT NULL');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users')) {
            DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS notification_phone');
            DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS notification_email');
            DB::statement('DROP INDEX IF EXISTS idx_users_notification_phone');
        }
    }
};
