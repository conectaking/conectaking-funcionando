<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Configurações gerais do módulo de agendamento por usuário
        if (!Schema::hasTable('booking_settings')) {
            DB::statement("
                CREATE TABLE booking_settings (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL UNIQUE,
                    business_name VARCHAR(150) NULL,
                    business_phone VARCHAR(30) NULL,
                    business_address VARCHAR(255) NULL,
                    slot_interval_minutes INT NOT NULL DEFAULT 30,
                    min_notice_hours INT NOT NULL DEFAULT 1,
                    max_days_advance INT NOT NULL DEFAULT 30,
                    auto_confirm BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_telegram BOOLEAN NOT NULL DEFAULT TRUE,
                    working_hours JSONB NOT NULL DEFAULT '{
                        \"0\": {\"enabled\": false, \"start\": \"09:00\", \"end\": \"18:00\"},
                        \"1\": {\"enabled\": true, \"start\": \"09:00\", \"end\": \"19:00\", \"break_start\": \"12:00\", \"break_end\": \"13:00\"},
                        \"2\": {\"enabled\": true, \"start\": \"09:00\", \"end\": \"19:00\", \"break_start\": \"12:00\", \"break_end\": \"13:00\"},
                        \"3\": {\"enabled\": true, \"start\": \"09:00\", \"end\": \"19:00\", \"break_start\": \"12:00\", \"break_end\": \"13:00\"},
                        \"4\": {\"enabled\": true, \"start\": \"09:00\", \"end\": \"19:00\", \"break_start\": \"12:00\", \"break_end\": \"13:00\"},
                        \"5\": {\"enabled\": true, \"start\": \"09:00\", \"end\": \"19:00\", \"break_start\": \"12:00\", \"break_end\": \"13:00\"},
                        \"6\": {\"enabled\": true, \"start\": \"09:00\", \"end\": \"18:00\", \"break_start\": \"12:00\", \"break_end\": \"13:00\"}
                    }',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            ");
            DB::statement("CREATE INDEX IF NOT EXISTS idx_booking_settings_user_id ON booking_settings(user_id)");
        }

        // 2. Serviços oferecidos (ex: Corte de Cabelo, Barba, Manicure, Consulta)
        if (!Schema::hasTable('booking_services')) {
            DB::statement("
                CREATE TABLE booking_services (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    name VARCHAR(150) NOT NULL,
                    description TEXT NULL,
                    duration_minutes INT NOT NULL DEFAULT 30,
                    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            ");
            DB::statement("CREATE INDEX IF NOT EXISTS idx_booking_services_user_active ON booking_services(user_id, is_active, sort_order)");
        }

        // 3. Profissionais / Atendentes (opcional, ex: Barbeiro 1, Barbeiro 2)
        if (!Schema::hasTable('booking_professionals')) {
            DB::statement("
                CREATE TABLE booking_professionals (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    name VARCHAR(150) NOT NULL,
                    avatar_url VARCHAR(500) NULL,
                    phone VARCHAR(30) NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            ");
            DB::statement("CREATE INDEX IF NOT EXISTS idx_booking_professionals_user_active ON booking_professionals(user_id, is_active, sort_order)");
        }

        // 4. Agendamentos
        if (!Schema::hasTable('booking_appointments')) {
            DB::statement("
                CREATE TABLE booking_appointments (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    service_id BIGINT NOT NULL,
                    professional_id BIGINT NULL,
                    client_name VARCHAR(150) NOT NULL,
                    client_phone VARCHAR(30) NOT NULL,
                    client_email VARCHAR(255) NULL,
                    appointment_date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
                    status VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- 'pending', 'confirmed', 'completed', 'cancelled'
                    notes TEXT NULL,
                    cancelled_reason TEXT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            ");
            DB::statement("CREATE INDEX IF NOT EXISTS idx_booking_appointments_user_date ON booking_appointments(user_id, appointment_date, start_time)");
            DB::statement("CREATE INDEX IF NOT EXISTS idx_booking_appointments_status ON booking_appointments(user_id, status)");
        }
    }

    public function down(): void
    {
        DB::statement("DROP TABLE IF EXISTS booking_appointments CASCADE");
        DB::statement("DROP TABLE IF EXISTS booking_professionals CASCADE");
        DB::statement("DROP TABLE IF EXISTS booking_services CASCADE");
        DB::statement("DROP TABLE IF EXISTS booking_settings CASCADE");
    }
};
