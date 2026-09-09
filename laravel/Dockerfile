# ---- assets (Vite) ----
FROM node:22-bookworm-slim AS assets
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY vite.config.js ./
COPY resources ./resources
RUN npm run build

# ---- app (FrankenPHP) ----
FROM dunglas/frankenphp:php8.4-bookworm

# Extensões PHP (install-php-extensions vem na imagem FrankenPHP)
RUN install-php-extensions pdo_pgsql pgsql zip gd opcache

# Preview KS: JPGs de câmara precisam de >128M no GD
RUN printf "memory_limit=512M\nupload_max_filesize=64M\npost_max_size=64M\n" \
    > /usr/local/etc/php/conf.d/zz-conectaking.ini

# poppler-utils + tesseract: OCR de documentos/comprovantes
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip poppler-utils tesseract-ocr tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

COPY . .
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

# HTTP puro: o Caddy do host termina TLS e faz reverse_proxy para :8080
ENV SERVER_NAME=:8080

EXPOSE 8080

COPY docker-entrypoint.sh /usr/local/bin/conectaking-entrypoint.sh
RUN chmod +x /usr/local/bin/conectaking-entrypoint.sh

CMD ["/usr/local/bin/conectaking-entrypoint.sh"]
