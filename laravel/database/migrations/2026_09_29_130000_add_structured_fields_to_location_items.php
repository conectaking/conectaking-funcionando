<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Garante que a tabela location_items existe antes de alterar
        if (! Schema::hasTable('location_items')) {
            Schema::create('location_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('profile_item_id')->unique();
                $table->text('address')->nullable();
                $table->text('address_formatted')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('place_name', 255)->nullable();
                $table->timestamps();
            });
        }

        Schema::table('location_items', function (Blueprint $table) {
            if (! Schema::hasColumn('location_items', 'street')) {
                $table->string('street', 255)->nullable()->after('place_name');
            }
            if (! Schema::hasColumn('location_items', 'house_number')) {
                $table->string('house_number', 30)->nullable()->after('street');
            }
            if (! Schema::hasColumn('location_items', 'complement')) {
                $table->string('complement', 100)->nullable()->after('house_number');
            }
            if (! Schema::hasColumn('location_items', 'bairro')) {
                $table->string('bairro', 150)->nullable()->after('complement');
            }
            if (! Schema::hasColumn('location_items', 'city')) {
                $table->string('city', 150)->nullable()->after('bairro');
            }
            if (! Schema::hasColumn('location_items', 'uf')) {
                $table->string('uf', 2)->nullable()->after('city');
            }
            if (! Schema::hasColumn('location_items', 'cep')) {
                $table->string('cep', 9)->nullable()->after('uf');
            }
        });
    }

    public function down(): void
    {
        Schema::table('location_items', function (Blueprint $table) {
            $table->dropColumn(array_filter(
                ['street', 'house_number', 'complement', 'bairro', 'city', 'uf', 'cep'],
                fn ($col) => Schema::hasColumn('location_items', $col)
            ));
        });
    }
};
