FROM php:8.1-apache
RUN apt update -y && apt install -y libpng-dev libjpeg-dev libzip-dev libonig-dev && \
      docker-php-ext-configure gd  --with-jpeg && \
      docker-php-ext-install zip gd && \
      a2enmod rewrite remoteip && \
      curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer


