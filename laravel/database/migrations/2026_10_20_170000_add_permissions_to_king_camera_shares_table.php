<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('king_camera_shares')) {
            Schema::table('king_camera_shares', function (Blueprint $table) {
                if (! Schema::hasColumn('king_camera_shares', 'can_light')) {
                    $table->boolean('can_light')->default(false)->after('can_ptz');
                }
                if (! Schema::hasColumn('king_camera_shares', 'can_snapshot')) {
                    $table->boolean('can_snapshot')->default(true)->after('can_light');
                }
                if (! Schema::hasColumn('king_camera_shares', 'can_record')) {
                    $table->boolean('can_record')->default(false)->after('can_snapshot');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('king_camera_shares')) {
            Schema::table('king_camera_shares', function (Blueprint $table) {
                if (Schema::hasColumn('king_camera_shares', 'can_light')) {
                    $table->dropColumn('can_light');
                }
                if (Schema::hasColumn('king_camera_shares', 'can_snapshot')) {
                    $table->dropColumn('can_snapshot');
                }
                if (Schema::hasColumn('king_camera_shares', 'can_record')) {
                    $table->dropColumn('can_record');
                }
            });
        }
    }
};
