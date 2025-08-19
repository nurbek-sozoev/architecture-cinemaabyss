FROM jenkins/jenkins:lts-jdk17

# Переключиться на root для установки дополнительных пакетов
USER root

# Установить Docker CLI
RUN apt-get update && apt-get install -y \
    docker.io \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Установить Docker Compose
RUN curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

# Переключиться обратно на jenkins пользователя
USER jenkins

# Копировать список плагинов
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt

# Установить плагины
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Копировать конфигурационные файлы Jenkins
COPY jenkins-config/ /usr/share/jenkins/ref/

# Настройка автоматической конфигурации
ENV JAVA_OPTS=-Djenkins.install.runSetupWizard=false
