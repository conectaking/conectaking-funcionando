<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Alertas operacionais: log + Sentry (se DSN/pacote disponíveis).
 */
class OpsAlertService
{
    public function warn(string $title, array $context = []): void
    {
        Log::warning($title, $context);
        $this->toSentry($title, $context, 'warning');
    }

    public function error(string $title, array $context = []): void
    {
        Log::error($title, $context);
        $this->toSentry($title, $context, 'error');
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function toSentry(string $title, array $context, string $level): void
    {
        if (! empty(env('SENTRY_LARAVEL_DSN'))) {
            try {
                if (function_exists('\\Sentry\\captureMessage')) {
                    \Sentry\withScope(function (\Sentry\State\Scope $scope) use ($title, $context, $level): void {
                        $scope->setLevel($level === 'error' ? \Sentry\Severity::error() : \Sentry\Severity::warning());
                        foreach ($context as $k => $v) {
                            if (is_scalar($v) || $v === null) {
                                $scope->setExtra((string) $k, $v);
                            } else {
                                $scope->setExtra((string) $k, json_encode($v));
                            }
                        }
                        \Sentry\captureMessage($title);
                    });
                }
            } catch (Throwable $e) {
                Log::debug('ops_alert.sentry_failed', ['message' => $e->getMessage()]);
            }
        }

        $this->toAgentWebhook($title, $context, $level);
    }

    /**
     * Avisa o CK Agent (n8n) → Telegram do admin.
     * URL: CK_AGENT_ALERT_WEBHOOK (ex. https://n8n.conectaking.com.br/webhook/ck-agent-sentry)
     *
     * @param  array<string, mixed>  $context
     */
    private function toAgentWebhook(string $title, array $context, string $level): void
    {
        $url = trim((string) env('CK_AGENT_ALERT_WEBHOOK', ''));
        if ($url === '') {
            return;
        }
        $secret = trim((string) env('CK_SENTRY_WEBHOOK_SECRET', ''));
        $payload = [
            'title' => $title,
            'message' => $title,
            'level' => $level,
            'project' => 'conectaking',
            'environment' => (string) env('APP_ENV', 'production'),
            'server_name' => 'conectaking-laravel',
            'url' => 'https://conecta-king.sentry.io/issues/?query=is%3Aunresolved',
            'context' => $context,
            'secret' => $secret,
        ];
        try {
            $headers = "Content-Type: application/json\r\n";
            if ($secret !== '') {
                $headers .= 'X-Ck-Secret: '.$secret."\r\n";
            }
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => $headers,
                    'content' => json_encode($payload, JSON_UNESCAPED_UNICODE),
                    'timeout' => 4,
                    'ignore_errors' => true,
                ],
            ]);
            @file_get_contents($url, false, $ctx);
        } catch (Throwable $e) {
            Log::debug('ops_alert.agent_webhook_failed', ['message' => $e->getMessage()]);
        }
    }
}
