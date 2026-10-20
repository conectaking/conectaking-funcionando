<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('king_camera_shares')) {
            Schema::create('king_camera_shares', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('camera_id')->index();
                $table->string('user_id', 255)->index();
                $table->string('share_token', 64)->unique();
                $table->string('label', 100)->nullable();
                $table->timestamp('expires_at')->index();
                $table->integer('duration_seconds')->default(3600);
                $table->boolean('can_audio')->default(true);
                $table->boolean('can_ptz')->default(false);
                $table->integer('view_count')->default(0);
                $table->boolean('is_active')->default(true);
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
        Schema::dropIfExists('king_camera_shares');
    }
};
