<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;

/**
 * SMTP mínimo (paridade Node/nodemailer) — usa SMTP_* do .env.prod.
 */
class SmtpMailer
{
    /**
     * @return array{success:bool, error?:string}
     */
    public function send(string $to, string $subject, string $html): array
    {
        $user = trim((string) (env('SMTP_USER') ?: ''));
        $pass = trim((string) (env('SMTP_PASS') ?: ''));
        if ($user === '' || $pass === '') {
            return ['success' => false, 'error' => 'SMTP não configurado'];
        }
        $host = trim((string) (env('SMTP_HOST') ?: 'smtp.gmail.com'));
        $port = (int) (env('SMTP_PORT') ?: 587);
        $from = trim((string) (env('SMTP_FROM') ?: 'noreply@conectaking.com.br'));
        $secure = strtolower((string) (env('SMTP_SECURE') ?: '')) === 'true' || $port === 465;

        $errno = 0;
        $errstr = '';
        $remote = ($secure ? 'ssl://' : '').$host.':'.$port;
        $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
        if (! $fp) {
            return ['success' => false, 'error' => "SMTP connect: {$errstr}"];
        }
        stream_set_timeout($fp, 20);

        try {
            $this->expect($fp, 220);
            $this->cmd($fp, 'EHLO conectaking.local', 250);
            if (! $secure && $port === 587) {
                $this->cmd($fp, 'STARTTLS', 220);
                $crypto = STREAM_CRYPTO_METHOD_TLS_CLIENT;
                if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                    $crypto |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
                }
                if (! @stream_socket_enable_crypto($fp, true, $crypto)) {
                    throw new \RuntimeException('STARTTLS falhou');
                }
                $this->cmd($fp, 'EHLO conectaking.local', 250);
            }
            $this->cmd($fp, 'AUTH LOGIN', 334);
            $this->cmd($fp, base64_encode($user), 334);
            $this->cmd($fp, base64_encode($pass), 235);
            $this->cmd($fp, 'MAIL FROM:<'.$from.'>', 250);
            $this->cmd($fp, 'RCPT TO:<'.$to.'>', 250);
            $this->cmd($fp, 'DATA', 354);
            $headers = [
                'From: Conecta King <'.$from.'>',
                'To: <'.$to.'>',
                'Subject: =?UTF-8?B?'.base64_encode($subject).'?=',
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
            ];
            $body = implode("\r\n", $headers)."\r\n\r\n".chunk_split(base64_encode($html))."\r\n.";
            fwrite($fp, $body."\r\n");
            $this->expect($fp, 250);
            $this->cmd($fp, 'QUIT', 221);
            fclose($fp);

            return ['success' => true];
        } catch (\Throwable $e) {
            Log::warning('smtp.send', ['error' => $e->getMessage()]);
            if (is_resource($fp)) {
                fclose($fp);
            }

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function cmd($fp, string $line, int $want): void
    {
        fwrite($fp, $line."\r\n");
        $this->expect($fp, $want);
    }

    private function expect($fp, int $code): void
    {
        $data = '';
        while (($line = fgets($fp, 512)) !== false) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        if ((int) substr($data, 0, 3) !== $code) {
            throw new \RuntimeException('SMTP unexpected: '.trim($data));
        }
    }
}
