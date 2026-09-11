<?php

namespace App\Jobs;

use App\Services\CartaoVirtual\KingSelectionMediaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class WarmKsGalleryThumbsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 900;

    public function __construct(
        public int $galleryId,
        public int $limit = 100,
    ) {
        $this->onQueue('default');
    }

    public function handle(KingSelectionMediaService $media): void
    {
        $result = $media->warmGalleryThumbsDetailed($this->galleryId, $this->limit, 360);
        $ok = (int) ($result['ok'] ?? 0);
        $failed = (int) ($result['failed'] ?? 0);
        $total = (int) ($result['total'] ?? 0);

        Log::info('ks.thumbs.warm', [
            'galleryId' => $this->galleryId,
            'ok' => $ok,
            'failed' => $failed,
            'total' => $total,
        ]);

        if ($total > 0 && ($failed / $total) > 0.2) {
            throw new \RuntimeException(
                "Warm thumbs parcial: {$failed}/{$total} falhas (gallery {$this->galleryId})"
            );
        }
    }
}
