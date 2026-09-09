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

RUN install-php-extensions pdo_pgsql pgsql zip gd opcache

RUN printf "memory_limit=512M\nupload_max_filesize=64M\npost_max_size=64M\n" \
    > /usr/local/etc/php/conf.d/zz-conectaking.ini

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip poppler-utils tesseract-ocr tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY laravel/composer.json laravel/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

COPY laravel/ ./
COPY --from=assets /app/public/build /app/public/build

RUN rm -f .env .env.backup \
    && rm -f bootstrap/cache/packages.php bootstrap/cache/services.php \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache \
    && php artisan package:discover --ansi

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr
ENV SESSION_DRIVER=file
ENV CACHE_STORE=file
ENV QUEUE_CONNECTION=sync

ENV SERVER_NAME=:8080

EXPOSE 8080

COPY laravel/docker-entrypoint.sh /usr/local/bin/conectaking-entrypoint.sh
RUN chmod +x /usr/local/bin/conectaking-entrypoint.sh

CMD ["/usr/local/bin/conectaking-entrypoint.sh"]
