<?php

namespace App\Services\Admin;

use App\Support\NanoId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Geração de chave curta de cadastro (routes/generator.js).
 */
class RegistrationCodeService
{
    public function createShortKey(): string
    {
        if (! Schema::hasTable('registration_codes')) {
            throw new \RuntimeException('Tabela registration_codes indisponível.');
        }

        $newKey = NanoId::generate(8);
        DB::insert('INSERT INTO registration_codes (code) VALUES (?)', [$newKey]);

        return $newKey;
    }
}
