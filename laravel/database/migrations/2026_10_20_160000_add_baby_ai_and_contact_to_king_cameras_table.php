<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('king_cameras', function (Blueprint $table) {
            if (! Schema::hasColumn('king_cameras', 'telegram_phone')) {
                $table->string('telegram_phone', 64)->nullable()->after('telegram_chat_id');
            }
            if (! Schema::hasColumn('king_cameras', 'crib_fence_enabled')) {
                $table->boolean('crib_fence_enabled')->default(false)->after('audio_detection_enabled');
            }
            if (! Schema::hasColumn('king_cameras', 'crib_roi_json')) {
                $table->json('crib_roi_json')->nullable()->after('crib_fence_enabled');
            }
            if (! Schema::hasColumn('king_cameras', 'baby_stand_enabled')) {
                $table->boolean('baby_stand_enabled')->default(false)->after('crib_roi_json');
            }
            if (! Schema::hasColumn('king_cameras', 'baby_cry_enabled')) {
                $table->boolean('baby_cry_enabled')->default(false)->after('baby_stand_enabled');
            }
            if (! Schema::hasColumn('king_cameras', 'auto_tracking_enabled')) {
                $table->boolean('auto_tracking_enabled')->default(false)->after('baby_cry_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('king_cameras', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['telegram_phone', 'crib_fence_enabled', 'crib_roi_json', 'baby_stand_enabled', 'baby_cry_enabled', 'auto_tracking_enabled'] as $col) {
                if (Schema::hasColumn('king_cameras', $col)) {
                    $columnsToDrop[] = $col;
                }
            }
            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
