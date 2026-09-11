# Build context: raiz do repo (docker compose context: .)
# ---- assets (Vite) ----
FROM node:22-bookworm-slim AS assets
WORKDIR /app
COPY laravel/package.json laravel/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY laravel/vite.config.js ./
COPY laravel/resources ./resources
# JS/CSS legados do painel (alias @legacy no Vite)
COPY public ./legacy-public
ENV VITE_LEGACY_PUBLIC=/app/legacy-public
RUN npm run build

# ---- app (FrankenPHP) ----
FROM dunglas/frankenphp:php8.4-bookworm

RUN install-php-extensions pdo_pgsql pgsql zip gd exif opcache redis

RUN printf "memory_limit=384M\nupload_max_filesize=64M\npost_max_size=64M\nopcache.enable=1\nopcache.memory_consumption=128\nopcache.max_accelerated_files=20000\nopcache.validate_timestamps=0\nopcache.jit=0\n" \
    > /usr/local/etc/php/conf.d/zz-conectaking.ini

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY laravel/composer.json laravel/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

COPY laravel/ ./
# Reinstala após o COPY completo: o lock pode ter mudado e o layer anterior do
# composer install pode estar em cache sem pacotes novos (ex.: sentry).
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts
COPY --from=assets /app/public/build /app/public/build
# Vendor estático (FA/Chart/etc.) também em /app/public para Caddy servir sem PHP
COPY --from=assets /app/legacy-public/vendor /app/public/vendor

RUN rm -f .env .env.backup \
    && rm -f bootstrap/cache/packages.php bootstrap/cache/services.php \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache \
    && php artisan package:discover --ansi

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr
# Defaults alinhados ao compose prod (sobrescritos por env_file se necessário)
ENV SESSION_DRIVER=redis
ENV CACHE_STORE=redis
ENV QUEUE_CONNECTION=redis

ENV SERVER_NAME=:8080

EXPOSE 8080

COPY laravel/docker-entrypoint.sh /usr/local/bin/conectaking-entrypoint.sh
RUN chmod +x /usr/local/bin/conectaking-entrypoint.sh

CMD ["/usr/local/bin/conectaking-entrypoint.sh"]
