# Jenkins для проекта CinemaAbyss

## Запуск Jenkins

### Вариант 1: Через docker-compose (рекомендуется)

1. Запустите Jenkins вместе с остальными сервисами:

```bash
docker-compose up -d jenkins
```

2. Или запустите все сервисы включая Jenkins:

```bash
docker-compose up -d
```

3. Jenkins будет доступен по адресу: http://localhost:8091

### Вариант 3: Кастомный образ с предустановленными плагинами

1. Соберите кастомный образ:

```bash
cd src/jenkins
docker build -t cinemaabyss-jenkins .
```

2. Запустите контейнер:

```bash
docker run -d \
  --name cinemaabyss-jenkins \
  -p 8091:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --user root \
  cinemaabyss-jenkins
```

## Первоначальная настройка

### Автоматическая настройка (для кастомного образа)

Если вы используете кастомный образ, Jenkins будет настроен автоматически:

- **Логин**: admin
- **Пароль**: admin123

### Ручная настройка

1. Откройте http://localhost:8091
2. Получите начальный пароль администратора:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

3. Следуйте мастеру настройки
4. Установите рекомендуемые плагины

## Настройка CI/CD Pipeline

1. Создайте новый элемент (Job) типа "Pipeline"
2. В разделе "Pipeline" выберите "Pipeline script from SCM"
3. Укажите ваш Git репозиторий
4. В поле "Script Path" укажите `Jenkinsfile`

## Полезные плагины

В кастомном образе уже установлены:

- Docker Workflow - для работы с Docker
- Kubernetes CLI - для деплоя в Kubernetes
- Git - для работы с репозиториями
- Blue Ocean - современный интерфейс
- Pipeline - для создания пайплайнов
- JUnit - для отчетов о тестах

## Интеграция с Docker

Jenkins настроен для работы с Docker:

- Доступ к Docker socket хоста
- Возможность сборки и пуша образов
- Запуск контейнеров для тестирования

## Интеграция с Kubernetes

Для деплоя в Kubernetes:

1. Установите kubectl в Jenkins контейнер
2. Настройте credentials для подключения к кластеру
3. Используйте плагин Kubernetes CLI в пайплайнах

## Мониторинг и логи

Просмотр логов Jenkins:

```bash
docker logs jenkins -f
```

## Бэкапы

Данные Jenkins хранятся в volume `jenkins-data`. Для создания бэкапа:

```bash
docker run --rm -v jenkins-data:/source -v $(pwd):/backup alpine tar czf /backup/jenkins-backup-$(date +%Y%m%d).tar.gz -C /source .
```

## Восстановление из бэкапа

```bash
docker run --rm -v jenkins-data:/target -v $(pwd):/backup alpine tar xzf /backup/jenkins-backup-YYYYMMDD.tar.gz -C /target
```

## Порты

- **8091** - веб-интерфейс Jenkins
- **50000** - порт для подключения агентов Jenkins

## Переменные окружения

В Jenkinsfile доступны:

- `BUILD_NUMBER` - номер сборки
- `BRANCH_NAME` - название ветки
- `GIT_COMMIT` - хеш коммита
- `WORKSPACE` - рабочая директория
