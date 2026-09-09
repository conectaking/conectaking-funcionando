<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Services\CartaoVirtual\BibleAdminBookStudyService;
use App\Services\CartaoVirtual\BibleAdminDev365Service;
use App\Services\CartaoVirtual\BibleProsperidadeAdminService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('dev365:run-calendar-job {jobId}', function (string $jobId) {
    app(BibleAdminDev365Service::class)->runCalendarMonthsJob($jobId);
    $this->info('done '.$jobId);
})->purpose('Executa job async Dev365 (calendar months)');

Artisan::command('prosperidade:run-range-job {jobId}', function (string $jobId) {
    app(BibleProsperidadeAdminService::class)->runRangeJob($jobId);
    $this->info('done '.$jobId);
})->purpose('Executa job async prosperidade (range AI)');

Artisan::command('book-study:run-ai-job {jobId}', function (string $jobId) {
    app(BibleAdminBookStudyService::class)->runBookStudyAiJob($jobId);
    $this->info('done '.$jobId);
})->purpose('Executa job async estudos por livro (IA)');
