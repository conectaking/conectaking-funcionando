FROM dunglas/frankenphp:php8.4-bookworm

# Extensões PHP (install-php-extensions vem na imagem FrankenPHP)
RUN install-php-extensions pdo_pgsql pgsql zip gd opcache

# poppler-utils + tesseract: OCR de documentos/comprovantes
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip poppler-utils tesseract-ocr tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

COPY . .

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

CMD ["frankenphp", "run", "--config", "/app/Caddyfile"]
