<?php

namespace App\Services\Auth;

use App\Support\SmtpMailer;
use App\Support\PasswordRules;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PasswordService
{
    public function __construct(private readonly SmtpMailer $mail)
    {
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function forgot(string $email): array
    {
        $email = strtolower(trim($email));
        $okMsg = 'Se o email existir, você receberá instruções para recuperar sua senha.';
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'E-mail inválido.']];
        }
        if (! Schema::hasTable('users') || ! Schema::hasTable('password_reset_tokens')) {
            return ['status' => 503, 'body' => ['success' => false, 'message' => 'Recuperação indisponível.']];
        }

        $user = DB::selectOne('SELECT id, email FROM users WHERE email = ? LIMIT 1', [$email]);
        if (! $user) {
            $alt = $this->emailLocalPartWithoutDots($email);
            if ($alt !== $email) {
                $user = DB::selectOne('SELECT id, email FROM users WHERE email = ? LIMIT 1', [$alt]);
            }
        }
        if (! $user) {
            return ['status' => 200, 'body' => ['success' => true, 'message' => $okMsg]];
        }

        $token = bin2hex(random_bytes(32));
        DB::delete('DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < NOW()', [(string) $user->id]);
        DB::insert(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, NOW() + interval \'1 hour\')',
            [(string) $user->id, $token]
        );

        $base = rtrim((string) (env('APP_URL') ?: 'https://www.conectaking.com.br'), '/');
        $resetUrl = $base.'/resetar-senha?token='.urlencode($token);
        $html = $this->resetEmailHtml($resetUrl);
        $send = $this->mail->send((string) $user->email, 'Recuperação de Senha - Conecta King', $html);
        if (! ($send['success'] ?? false)) {
            Log::error('password.forgot.mail', ['error' => $send['error'] ?? 'fail', 'userId' => $user->id]);
            // Mesma resposta genérica (não enumerar e-mail via 503)
            return ['status' => 200, 'body' => ['success' => true, 'message' => $okMsg]];
        }

        return ['status' => 200, 'body' => ['success' => true, 'message' => $okMsg]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function reset(string $token, string $password): array
    {
        $token = trim($token);
        if ($token === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Token é obrigatório']];
        }
        $strength = $this->validatePasswordStrength($password);
        if (! $strength['valid']) {
            return ['status' => 400, 'body' => [
                'success' => false,
                'message' => $strength['errors'][0] ?? 'Senha inválida.',
            ]];
        }
        $row = DB::selectOne(
            'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1',
            [$token]
        );
        if (! $row) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Token inválido ou expirado']];
        }
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
        DB::update('UPDATE users SET password_hash = ? WHERE id = ?', [$hash, (string) $row->user_id]);
        DB::delete('DELETE FROM password_reset_tokens WHERE token = ?', [$token]);

        return ['status' => 200, 'body' => ['success' => true, 'message' => 'Senha alterada com sucesso!']];
    }

    /**
     * @return array{valid:bool, errors:list<string>}
     */
    private function validatePasswordStrength(string $password): array
    {
        return PasswordRules::validate($password);
    }

    private function emailLocalPartWithoutDots(string $email): string
    {
        $parts = explode('@', $email, 2);
        if (count($parts) !== 2) {
            return $email;
        }

        return str_replace('.', '', $parts[0]).'@'.$parts[1];
    }

    private function resetEmailHtml(string $resetUrl): string
    {
        $safe = e($resetUrl);

        return <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #ffd700;">CONECTA KING</h1>
    <p style="color: #999;">Recuperação de Senha</p>
  </div>
  <div style="background-color: #2a2a2a; padding: 30px; border-radius: 10px;">
    <h2 style="color: #ffd700; margin-top: 0;">Olá!</h2>
    <p>Você solicitou a recuperação de senha para sua conta no Conecta King.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{$safe}" style="display: inline-block; background-color: #ffd700; color: #1a1a1a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Resetar Senha</a>
    </div>
    <p style="color: #999; font-size: 14px;">Ou copie o link:<br><a href="{$safe}" style="color: #ffd700; word-break: break-all;">{$safe}</a></p>
  </div>
  <p style="color: #999; font-size: 12px; text-align: center;">Este link expira em 1 hora.</p>
</div>
HTML;
    }
}
