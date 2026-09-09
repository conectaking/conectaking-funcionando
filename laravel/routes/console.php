<?php

use App\Services\CartaoVirtual\BibleAdminBookStudyService;
use App\Services\CartaoVirtual\BibleAdminDev365Service;
use App\Services\CartaoVirtual\BibleProsperidadeAdminService;
use App\Services\MaintenanceService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

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

Artisan::command('maintenance:expire-subscriptions-morning', function () {
    $r = app(MaintenanceService::class)->expireSubscriptionsMorning();
    $this->info(json_encode($r));
})->purpose('Expira assinaturas active/active_onetime (paridade cron 08:00 Node)');

Artisan::command('maintenance:expire-subscriptions-midnight', function () {
    $r = app(MaintenanceService::class)->expireSubscriptionsMidnight();
    $this->info(json_encode($r));
})->purpose('Expira trials e individuais (paridade cron 00:00 Node)');

Artisan::command('maintenance:cleanup', function () {
    $r = app(MaintenanceService::class)->cleanupExpiredData();
    $this->info(json_encode($r));
})->purpose('Limpa tokens/cache expirados (paridade cron 02:00 Node)');

// Timezone: America/Sao_Paulo (mesmo horário civil do Node na VPS BR)
Schedule::command('maintenance:expire-subscriptions-morning')
    ->dailyAt('08:00')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping();

Schedule::command('maintenance:expire-subscriptions-midnight')
    ->dailyAt('00:00')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping();

Schedule::command('maintenance:cleanup')
    ->dailyAt('02:00')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping();
