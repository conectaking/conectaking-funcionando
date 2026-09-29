<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('digital_form_items')) {
            Schema::table('digital_form_items', function (Blueprint $table) {
                if (! Schema::hasColumn('digital_form_items', 'button_logo_shape')) {
                    $table->string('button_logo_shape', 20)->default('rounded')->nullable()->after('button_logo_size');
                }
                if (! Schema::hasColumn('digital_form_items', 'button_logo_remove_bg')) {
                    $table->boolean('button_logo_remove_bg')->default(false)->nullable()->after('button_logo_shape');
                }
            });
        }

        if (Schema::hasTable('guest_list_items')) {
            Schema::table('guest_list_items', function (Blueprint $table) {
                if (! Schema::hasColumn('guest_list_items', 'button_logo_shape')) {
                    $table->string('button_logo_shape', 20)->default('rounded')->nullable()->after('button_logo_size');
                }
                if (! Schema::hasColumn('guest_list_items', 'button_logo_remove_bg')) {
                    $table->boolean('button_logo_remove_bg')->default(false)->nullable()->after('button_logo_shape');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('digital_form_items')) {
            Schema::table('digital_form_items', function (Blueprint $table) {
                $table->dropColumn(array_filter(
                    ['button_logo_shape', 'button_logo_remove_bg'],
                    fn ($col) => Schema::hasColumn('digital_form_items', $col)
                ));
            });
        }

        if (Schema::hasTable('guest_list_items')) {
            Schema::table('guest_list_items', function (Blueprint $table) {
                $table->dropColumn(array_filter(
                    ['button_logo_shape', 'button_logo_remove_bg'],
                    fn ($col) => Schema::hasColumn('guest_list_items', $col)
                ));
            });
        }
    }
};
