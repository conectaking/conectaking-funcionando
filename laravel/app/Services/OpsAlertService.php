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
        if (empty(env('SENTRY_LARAVEL_DSN'))) {
            return;
        }
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
}
