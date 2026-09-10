<?php

namespace App\Jobs;

use App\Services\CartaoVirtual\KingSelectionMediaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class WarmKsGalleryThumbsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 900;

    public function __construct(
        public int $galleryId,
        public int $limit = 100,
    ) {
        $this->onQueue('default');
    }

    public function handle(KingSelectionMediaService $media): void
    {
        try {
            $n = $media->warmGalleryThumbs($this->galleryId, $this->limit, 360);
            Log::info('ks.thumbs.warm', ['galleryId' => $this->galleryId, 'ok' => $n]);
        } catch (\Throwable $e) {
            Log::warning('ks.thumbs.warm.fail', [
                'galleryId' => $this->galleryId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
