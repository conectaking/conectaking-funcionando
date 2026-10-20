<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('king_cameras')) {
            Schema::create('king_cameras', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('user_id', 255)->index();
                $table->string('name', 100);
                $table->string('room', 100)->nullable();
                $table->string('brand', 50)->default('generic');
                $table->string('ip_address', 64);
                $table->integer('rtsp_port')->default(554);
                $table->integer('onvif_port')->default(80);
                $table->string('stream_path', 255)->default('/onvif1');
                $table->string('username', 100)->default('admin');
                $table->text('password');
                $table->string('stream_id', 100)->unique();
                $table->string('status', 20)->default('offline');
                $table->string('telegram_chat_id', 64)->nullable();
                $table->boolean('telegram_alerts_enabled')->default(true);
                $table->boolean('motion_detection_enabled')->default(true);
                $table->boolean('audio_detection_enabled')->default(false);
                $table->json('roi_zones_json')->nullable();
                $table->timestamp('last_event_at')->nullable();
                $table->text('last_snapshot_url')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('king_camera_events')) {
            Schema::create('king_camera_events', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('camera_id')->index();
                $table->string('user_id', 255)->index();
                $table->string('event_type', 50)->default('motion');
                $table->text('description')->nullable();
                $table->text('snapshot_path')->nullable();
                $table->boolean('notified_telegram')->default(false);
                $table->timestamps();

                $table->foreign('camera_id')
                    ->references('id')
                    ->on('king_cameras')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('king_camera_events');
        Schema::dropIfExists('king_cameras');
    }
};
