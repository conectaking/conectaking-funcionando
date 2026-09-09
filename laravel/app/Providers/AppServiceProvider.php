<?php

namespace App\Providers;

use App\Support\SafeUrl;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
