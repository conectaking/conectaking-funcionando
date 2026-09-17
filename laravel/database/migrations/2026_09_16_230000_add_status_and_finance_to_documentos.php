<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('documentos')) {
            Schema::table('documentos', function (Blueprint $table) {
                if (!Schema::hasColumn('documentos', 'status')) {
                    $table->string('status', 20)->default('pendente');
                    $table->index(['status'], 'idx_documentos_status');
                }
                if (!Schema::hasColumn('documentos', 'finance_transaction_id')) {
                    $table->unsignedBigInteger('finance_transaction_id')->nullable()->default(null);
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('documentos')) {
            Schema::table('documentos', function (Blueprint $table) {
                if (Schema::hasColumn('documentos', 'status')) {
                    $table->dropIndex('idx_documentos_status');
                    $table->dropColumn('status');
                }
                if (Schema::hasColumn('documentos', 'finance_transaction_id')) {
                    $table->dropColumn('finance_transaction_id');
                }
            });
        }
    }
};
