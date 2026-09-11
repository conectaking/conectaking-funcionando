<?php

namespace App\Jobs;

use App\Services\CartaoVirtual\BibleAdminBookStudyService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class RunBookStudyAiJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 3600;

    public function __construct(public string $jobId)
    {
        $this->onQueue('default');
    }

    public function handle(BibleAdminBookStudyService $service): void
    {
        try {
            $service->runBookStudyAiJob($this->jobId);
        } catch (\Throwable $e) {
            Log::error('bible.bookStudy.job', ['jobId' => $this->jobId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }
}
