<?php

namespace App\Jobs;

use App\Services\CartaoVirtual\KingSelectionFaceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessGalleryFacesJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 3600;

    public function __construct(
        public int $galleryId,
        public bool $force,
        public int $concurrency,
        public string $speedMode,
    ) {
        $this->onQueue('default');
    }

    public function handle(KingSelectionFaceService $faces): void
    {
        try {
            $faces->runGalleryPhotosThroughRekognition(
                $this->galleryId,
                $this->force,
                $this->concurrency,
                ['speedMode' => $this->speedMode]
            );
        } catch (\Throwable $e) {
            Log::error('ks.face.processAll.job', [
                'galleryId' => $this->galleryId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
