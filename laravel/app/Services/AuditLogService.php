<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AuditLogService
{
    /**
     * @param  array<string,mixed>  $details
     */
    public function log(
        ?string $userId,
        string $actionType,
        string $resourceType,
        ?int $resourceId = null,
        array $details = [],
        ?string $ip = null,
        ?string $userAgent = null,
        ?string $method = null,
        ?string $path = null,
        ?int $statusCode = null,
    ): void {
        try {
            if (! Schema::hasTable('audit_logs')) {
                return;
            }
            DB::table('audit_logs')->insert([
                'user_id' => $userId,
                'action_type' => substr($actionType, 0, 100),
                'resource_type' => substr($resourceType, 0, 100),
                'resource_id' => $resourceId,
                'details' => $details === [] ? null : json_encode($details, JSON_UNESCAPED_UNICODE),
                'ip_address' => $ip,
                'user_agent' => $userAgent !== null ? substr($userAgent, 0, 2000) : null,
                'request_method' => $method !== null ? substr($method, 0, 10) : null,
                'request_path' => $path !== null ? substr($path, 0, 2000) : null,
                'status_code' => $statusCode,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('audit.log', ['error' => $e->getMessage()]);
        }
    }
}
