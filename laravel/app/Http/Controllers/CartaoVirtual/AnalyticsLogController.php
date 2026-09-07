<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\AnalyticsLogService;
use Illuminate\Http\Request;

class AnalyticsLogController extends Controller
{
    public function __construct(private readonly AnalyticsLogService $logs)
    {
    }

    public function view(Request $request, string $userId)
    {
        if ($userId !== '') {
            $this->logs->logEvent($userId, 'view', null, $request);
        }

        return response('', 204)->header('X-Conecta-Engine', 'laravel');
    }

    public function clickItem(Request $request, string $itemId)
    {
        if (ctype_digit($itemId) && (int) $itemId > 0) {
            $userId = $this->logs->resolveUserIdForItem((int) $itemId);
            if ($userId) {
                $this->logs->logEvent($userId, 'click', (int) $itemId, $request);
            }
        }

        return response('', 204)->header('X-Conecta-Engine', 'laravel');
    }

    public function vcard(Request $request, string $userId)
    {
        if ($userId !== '') {
            $this->logs->logEvent($userId, 'vcard_download', null, $request);
        }

        return response('', 204)->header('X-Conecta-Engine', 'laravel');
    }
}
