<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Índices quentes KS para VPS (slug/folder).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('king_photos') && Schema::hasColumn('king_photos', 'folder_id')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_king_photos_gallery_folder ON king_photos (gallery_id, folder_id)');
        }
        if (Schema::hasTable('king_galleries') && Schema::hasColumn('king_galleries', 'slug')) {
            // Resolve slug com LOWER(TRIM(slug))
            DB::statement('CREATE INDEX IF NOT EXISTS idx_king_galleries_slug_lower ON king_galleries (lower(trim(slug)))');
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_king_photos_gallery_folder');
        DB::statement('DROP INDEX IF EXISTS idx_king_galleries_slug_lower');
    }
};
