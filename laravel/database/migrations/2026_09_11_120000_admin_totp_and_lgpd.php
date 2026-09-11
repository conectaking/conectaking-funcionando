<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT');
            DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMP NULL');
            DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_recovery_codes JSONB');
        }

        if (! Schema::hasTable('account_deletion_requests')) {
            DB::statement("
                CREATE TABLE account_deletion_requests (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    token_hash VARCHAR(128) NOT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'pending',
                    scheduled_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP NULL
                )
            ");
            DB::statement('CREATE INDEX IF NOT EXISTS idx_account_deletion_user ON account_deletion_requests(user_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_account_deletion_status ON account_deletion_requests(status)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('account_deletion_requests');
    }
};
