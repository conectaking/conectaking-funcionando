<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('charlene_memories')) {
            Schema::create('charlene_memories', function (Blueprint $table) {
                $table->id();
                $table->string('category', 50)->default('geral')->index(); // 'familia', 'pessoa', 'pedido_oracao', 'fato', 'gosto'
                $table->string('subject', 120)->index(); // Ex: 'mae_samara', 'bispo_fernando', 'vovo_socorro'
                $table->text('content'); // Descrição / fato lembrado
                $table->string('learned_from', 50)->default('alexa_voz');
                $table->timestamp('last_mentioned_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('charlene_memories');
    }
};
