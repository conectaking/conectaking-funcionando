<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Campos de Plano e Cota do King Selection na tabela users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'king_selection_enabled')) {
                $table->boolean('king_selection_enabled')->default(false)->after('email');
            }
            if (!Schema::hasColumn('users', 'king_selection_plan')) {
                $table->string('king_selection_plan', 50)->default('plan_20gb')->after('king_selection_enabled');
            }
            if (!Schema::hasColumn('users', 'king_selection_storage_limit_bytes')) {
                $table->bigInteger('king_selection_storage_limit_bytes')->default(21474836480)->after('king_selection_plan'); // 20 GB
            }
            if (!Schema::hasColumn('users', 'king_selection_plan_price')) {
                $table->decimal('king_selection_plan_price', 10, 2)->default(39.90)->after('king_selection_storage_limit_bytes');
            }
            if (!Schema::hasColumn('users', 'king_selection_notes')) {
                $table->text('king_selection_notes')->nullable()->after('king_selection_plan_price');
            }
        });

        // 2. Coluna de tamanho em bytes na tabela king_photos
        if (Schema::hasTable('king_photos')) {
            Schema::table('king_photos', function (Blueprint $table) {
                if (!Schema::hasColumn('king_photos', 'file_size_bytes')) {
                    $table->bigInteger('file_size_bytes')->default(0)->after('file_path');
                }
                if (!Schema::hasColumn('king_photos', 'width')) {
                    $table->integer('width')->nullable()->after('file_size_bytes');
                }
                if (!Schema::hasColumn('king_photos', 'height')) {
                    $table->integer('height')->nullable()->after('width');
                }
            });
        }

        // 3. Ativa automaticamente o King Selection para administradores e para usuários que já possuem galerias
        try {
            DB::statement("UPDATE users SET king_selection_enabled = TRUE, king_selection_plan = 'plan_70gb', king_selection_storage_limit_bytes = 75161927680, king_selection_plan_price = 99.90 WHERE is_admin = TRUE OR account_type = 'admin'");
            DB::statement("UPDATE users SET king_selection_enabled = TRUE WHERE id IN (SELECT DISTINCT pi.user_id FROM profile_items pi JOIN king_galleries g ON g.profile_item_id = pi.id)");
        } catch (\Throwable $e) {
            // Continua mesmo se falhar
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'king_selection_enabled',
                'king_selection_plan',
                'king_selection_storage_limit_bytes',
                'king_selection_plan_price',
                'king_selection_notes',
            ]);
        });

        if (Schema::hasTable('king_photos')) {
            Schema::table('king_photos', function (Blueprint $table) {
                $table->dropColumn(['file_size_bytes', 'width', 'height']);
            });
        }
    }
};

