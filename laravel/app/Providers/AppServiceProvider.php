<?php

namespace App\Providers;

use App\Services\CartaoVirtual\FormPublicService;
use App\Services\CartaoVirtual\KingFormsNotificationService;
use App\Support\SafeUrl;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

use App\Services\CartaoVirtual\KingSelectionNotificationService;
use App\Services\CartaoVirtual\KingSelectionSelectionService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Injeta automaticamente o KingFormsNotificationService no FormPublicService
        // quando o container resolve o serviço — sem mudar o construtor original.
        $this->app->resolving(FormPublicService::class, function (FormPublicService $service, $app) {
            $service->setNotifier($app->make(KingFormsNotificationService::class));
        });

        // Injeta automaticamente o KingSelectionNotificationService no KingSelectionSelectionService
        $this->app->resolving(KingSelectionSelectionService::class, function (KingSelectionSelectionService $service, $app) {
            $service->setNotificationService($app->make(KingSelectionNotificationService::class));
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Blade::directive('safeUrl', function ($expression) {
            return "<?php echo e(\\App\\Support\\SafeUrl::publicHref($expression)); ?>";
        });
    }
}
