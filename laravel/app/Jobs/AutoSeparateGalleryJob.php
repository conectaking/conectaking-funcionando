<?php

namespace App\Jobs;

use App\Services\CartaoVirtual\KingSelectionFaceService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class AutoSeparateGalleryJob implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 3600;

    public int $uniqueFor = 3600;

    public function __construct(
        public int $galleryId,
        public int $jobId,
        public bool $force,
        public int $concurrency,
        public string $speedMode,
        public float $minSimilarity,
    ) {
        $this->onQueue('ks-faces');
    }

    public function uniqueId(): string
    {
        return 'ks-auto-separate:'.$this->galleryId;
    }

    public function handle(KingSelectionFaceService $faces): void
    {
        try {
            $faces->runAutoSeparateJobWorker(
                $this->galleryId,
                $this->jobId,
                $this->force,
                $this->concurrency,
                $this->speedMode,
                $this->minSimilarity
            );
        } catch (\Throwable $e) {
            Log::error('ks.face.autoSeparate.job', [
                'galleryId' => $this->galleryId,
                'jobId' => $this->jobId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
