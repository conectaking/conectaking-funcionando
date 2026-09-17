<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('king_galleries') && !Schema::hasColumn('king_galleries', 'deleted_at')) {
            Schema::table('king_galleries', function (Blueprint $table) {
                $table->timestamp('deleted_at')->nullable()->default(null);
                $table->index(['deleted_at'], 'idx_king_galleries_deleted_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('king_galleries') && Schema::hasColumn('king_galleries', 'deleted_at')) {
            Schema::table('king_galleries', function (Blueprint $table) {
                $table->dropIndex('idx_king_galleries_deleted_at');
                $table->dropColumn('deleted_at');
            });
        }
    }
};
