# Use an official PHP image with Apache
FROM php:8.2-apache

# Install PostgreSQL client libraries
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql

# Copy your PHP files to the web server directory
COPY . /var/www/html/

# Use the default production configuration
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Set permissions for Apache
RUN chown -R www-data:www-data /var/www/html