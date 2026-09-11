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

Artisan::command('maintenance:failed-jobs-alert', function () {
    $n = 0;
    try {
        if (\App\Support\SchemaMeta::hasTable('failed_jobs')) {
            $n = (int) (\Illuminate\Support\Facades\DB::selectOne('SELECT COUNT(*)::int AS n FROM failed_jobs')->n ?? 0);
        }
    } catch (\Throwable $e) {
        $this->error($e->getMessage());

        return 1;
    }
    if ($n > 0) {
        app(\App\Services\OpsAlertService::class)->warn('queue.failed_jobs', [
            'count' => $n,
            'hint' => 'docker exec conectaking-laravel php artisan queue:failed',
        ]);
        $this->warn("failed_jobs={$n} — revise: docker exec conectaking-laravel php artisan queue:failed");
        $this->warn('Retry: php artisan queue:retry all | Flush: php artisan queue:flush');

        return 0;
    }
    $this->info('failed_jobs=0');

    return 0;
})->purpose('Alerta se houver jobs falhados na fila');

Artisan::command('maintenance:ops-alert {title} {--level=error}', function (string $title) {
    $level = strtolower((string) $this->option('level')) === 'warn' ? 'warn' : 'error';
    $svc = app(\App\Services\OpsAlertService::class);
    if ($level === 'warn') {
        $svc->warn($title, ['source' => 'cli']);
    } else {
        $svc->error($title, ['source' => 'cli']);
    }
    $this->info('alert sent: '.$title);

    return 0;
})->purpose('Envia alerta ops (log + Sentry) — usado pelo backup do host');


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

Schedule::command('maintenance:failed-jobs-alert')
    ->hourly()
    ->withoutOverlapping();
