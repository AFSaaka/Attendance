FROM php:8.2-apache

# Install system dependencies + Postgres extensions
RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    libzip-dev \
    && docker-php-ext-install pdo pdo_pgsql zip

# Enable Apache Mod_Rewrite
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy backend code
COPY . /var/www/html/

WORKDIR /var/www/html

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Point Apache to the 'public' folder
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

# Increase PHP limits for bulk uploads
RUN echo "upload_max_filesize = 32M"   >> /usr/local/etc/php/php.ini \
 && echo "post_max_size = 32M"         >> /usr/local/etc/php/php.ini \
 && echo "max_execution_time = 120"    >> /usr/local/etc/php/php.ini \
 && echo "max_input_time = 120"        >> /usr/local/etc/php/php.ini \
 && echo "memory_limit = 256M"         >> /usr/local/etc/php/php.ini

# Increase Apache timeout to survive long uploads
RUN echo "Timeout 120" >> /etc/apache2/apache2.conf

EXPOSE 80