<?php

namespace App\Services\Admin;

use App\Support\NanoId;
use Illuminate\Support\Facades\DB;

/**
 * Códigos de registro no painel admin (porte de `modules/admin/codes`).
 */
class AdminCodesService
{
    /**
     * @return array<string,mixed>
     */
    public function generateManual(mixed $customCode, mixed $expiresAt): array
    {
        $code = is_string($customCode) ? $customCode : '';
        if ($code === '' || strlen($code) > 32 || str_contains($code, ' ')) {
            return ['error' => 'Código personalizado inválido, muito longo ou contém espaços.', 'status' => 400];
        }
        $parsed = $this->parseExpiresAt($expiresAt);
        if ($parsed === false) {
            return ['error' => 'Data de expiração inválida.', 'status' => 400];
        }
        $this->insertCode($code, $parsed);

        return ['codes' => [$code], 'message' => "Código '{$code}' criado com sucesso!"];
    }

    /**
     * @return array<string,mixed>
     */
    public function generateCode(mixed $expiresAt): array
    {
        $parsed = $this->parseExpiresAt($expiresAt);
        if ($parsed === false) {
            return ['error' => 'Data de expiração inválida.', 'status' => 400];
        }
        $code = NanoId::generate(8);
        $this->insertCode($code, $parsed);

        return ['code' => $code, 'message' => 'Novo código gerado com sucesso!'];
    }

    /**
     * @return array<string,mixed>
     */
    public function generateBatch(mixed $prefix, mixed $count, mixed $expiresAt): array
    {
        $prefix = is_string($prefix) ? trim($prefix) : '';
        $n = is_numeric($count) ? (int) $count : 0;
        if ($prefix === '' || $n < 1 || $n > 100) {
            return ['error' => 'Prefixo e quantidade (1-100) são obrigatórios.', 'status' => 400];
        }
        $parsed = $this->parseExpiresAt($expiresAt);
        if ($parsed === false) {
            return ['error' => 'Data de expiração inválida.', 'status' => 400];
        }
        $codes = [];
        for ($i = 0; $i < $n; $i++) {
            $codes[] = $prefix.NanoId::generate(8);
        }
        foreach ($codes as $code) {
            $this->insertCode($code, $parsed);
        }

        return ['codes' => $codes, 'message' => "{$n} códigos gerados com sucesso!"];
    }

    /**
     * `expiresAt` ausente no body limpa a data (compatível com o contrato antigo da API).
     *
     * @return array<string,mixed>
     */
    public function updateCode(string $code, mixed $expiresAt): array
    {
        $parsed = $this->parseExpiresAt($expiresAt);
        if ($parsed === false) {
            return ['error' => 'Data de expiração inválida.', 'status' => 400];
        }
        $updated = DB::selectOne(
            'UPDATE registration_codes SET expires_at = ? WHERE code = ? RETURNING *',
            [$parsed, $code]
        );
        if (! $updated) {
            return ['error' => 'Código não encontrado.', 'status' => 404];
        }

        return ['code' => (array) $updated, 'message' => 'Código atualizado com sucesso!'];
    }

    /**
     * @return array<string,mixed>
     */
    public function deleteCode(string $code): array
    {
        $deleted = DB::delete('DELETE FROM registration_codes WHERE code = ?', [$code]);
        if ($deleted < 1) {
            return ['error' => 'Código não encontrado.', 'status' => 404];
        }

        return ['message' => 'Código de registro deletado com sucesso.'];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function autoDeleteConfig(): array
    {
        return array_map(
            static fn ($r): array => (array) $r,
            DB::select('SELECT * FROM code_auto_delete_config ORDER BY days_after_expiration')
        );
    }

    /**
     * @return array<string,mixed>
     */
    public function saveAutoDeleteConfig(mixed $days, mixed $isActive): array
    {
        $d = is_numeric($days) ? (int) $days : 0;
        if ($d < 1) {
            return ['error' => 'days_after_expiration deve ser maior que 0.', 'status' => 400];
        }
        $active = $isActive === null ? true : (bool) $isActive;
        $config = DB::selectOne(
            'INSERT INTO code_auto_delete_config (days_after_expiration, is_active, updated_at)
             VALUES (?, ?, NOW())
             ON CONFLICT (days_after_expiration)
             DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW()
             RETURNING *',
            [$d, $active]
        );

        return ['config' => $config ? (array) $config : null, 'message' => 'Configuração salva com sucesso!'];
    }

    /**
     * @return array<string,mixed>
     */
    public function executeAutoDelete(): array
    {
        $configs = DB::select('SELECT days_after_expiration FROM code_auto_delete_config WHERE is_active = true');
        if ($configs === []) {
            return ['message' => 'Nenhuma configuração ativa encontrada.', 'deleted' => 0];
        }
        $total = 0;
        foreach ($configs as $config) {
            $cutoff = now()->subDays((int) $config->days_after_expiration)->toDateTimeString();
            $total += DB::delete(
                'DELETE FROM registration_codes
                 WHERE expires_at IS NOT NULL AND expires_at < ? AND is_claimed = false',
                [$cutoff]
            );
        }

        return ['message' => "Exclusão automática executada. {$total} código(s) excluído(s).", 'deleted' => $total];
    }

    private function insertCode(string $code, ?string $expiresAt): void
    {
        DB::insert('INSERT INTO registration_codes (code, expires_at) VALUES (?, ?)', [$code, $expiresAt]);
    }

    /**
     * @return string|null|false false = data inválida
     */
    private function parseExpiresAt(mixed $expiresAt): string|null|false
    {
        if ($expiresAt === null || $expiresAt === '') {
            return null;
        }
        try {
            return \Illuminate\Support\Carbon::parse((string) $expiresAt)->toDateTimeString();
        } catch (\Throwable) {
            return false;
        }
    }
}
