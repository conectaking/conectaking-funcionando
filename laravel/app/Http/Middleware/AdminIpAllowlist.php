<?php

namespace App\Http\Middleware;

use App\Support\ClientIp;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Allowlist opcional de IPs para área admin (ADMIN_IP_ALLOWLIST=1.2.3.4,10.0.0.0/8).
 * Vazio = desligado.
 */
class AdminIpAllowlist
{
    public function handle(Request $request, Closure $next): Response
    {
        $raw = trim((string) env('ADMIN_IP_ALLOWLIST', ''));
        if ($raw === '') {
            return $next($request);
        }

        $client = ClientIp::from($request);
        $allowed = false;
        foreach (array_filter(array_map('trim', explode(',', $raw))) as $entry) {
            if ($this->matchIp($client, $entry)) {
                $allowed = true;
                break;
            }
        }

        if (! $allowed) {
            return response()->json([
                'success' => false,
                'message' => 'Acesso admin bloqueado para este IP.',
                'client_ip' => $client,
            ], 403)->header('X-Conecta-Engine', 'laravel');
        }

        return $next($request);
    }

    private function matchIp(string $ip, string $entry): bool
    {
        if ($entry === $ip) {
            return true;
        }
        if (! str_contains($entry, '/')) {
            return false;
        }
        [$subnet, $bits] = explode('/', $entry, 2);
        $bits = (int) $bits;
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $ipLong = ip2long($ip);
            $subLong = ip2long($subnet);
            $mask = -1 << (32 - max(0, min(32, $bits)));

            return ($ipLong & $mask) === ($subLong & $mask);
        }

        return false;
    }
}
