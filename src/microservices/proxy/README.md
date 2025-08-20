# CinemaAbyss Proxy Service

Strangler Fig API Gateway написанный на Node.js + TypeScript + Koa для постепенной миграции от монолита к микросервисам.

## 🚀 Возможности

- **Strangler Fig Pattern** - постепенная миграция трафика
- **Feature Flags** - управление процентом миграции
- **Health Checks** - мониторинг состояния сервиса
- **Request Routing** - интеллектуальная маршрутизация
- **Error Handling** - обработка ошибок upstream сервисов
- **Request/Response Logging** - детальное логирование
- **Graceful Shutdown** - корректное завершение работы

## 🛠️ Технологический стек

- **Node.js 18+** - среда выполнения
- **TypeScript** - статическая типизация
- **Koa** - веб-фреймворк
- **Axios** - HTTP клиент для проксирования
- **Docker** - контейнеризация

## 📝 Конфигурация

Сервис настраивается через переменные окружения:

| Переменная                 | Описание                              | По умолчанию            |
| -------------------------- | ------------------------------------- | ----------------------- |
| `PORT`                     | Порт сервиса                          | `3200`                  |
| `MONOLITH_URL`             | URL монолита                          | `http://localhost:3280` |
| `MOVIES_SERVICE_URL`       | URL микросервиса фильмов              | `http://localhost:3281` |
| `EVENTS_SERVICE_URL`       | URL микросервиса событий              | `http://localhost:3282` |
| `GRADUAL_MIGRATION`        | Включить постепенную миграцию         | `true`                  |
| `MOVIES_MIGRATION_PERCENT` | Процент трафика в микросервис (0-100) | `0`                     |
| `NODE_ENV`                 | Окружение                             | `development`           |

## 🎯 Маршрутизация

### Strangler Fig для Movies API

```
/api/movies/* →
├── [X% трафика] → Movies Microservice
└── [100-X% трафика] → Monolith
```

### Другие API

```
/api/events/* → Events Service
/api/* → Monolith (по умолчанию)
/health → Health Check
```

## 🚦 Запуск

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Разработка с hot reload
npm run dev

# Сборка
npm run build

# Продакшн запуск
npm start
```

### Docker

```bash
# Сборка образа
docker build -t cinemaabyss-proxy .

# Запуск контейнера
docker run -p 3200:3200 \
  -e MOVIES_MIGRATION_PERCENT=50 \
  cinemaabyss-proxy
```

### Docker Compose

```bash
# Запуск всей системы
docker-compose up -d

# Только прокси-сервис
docker-compose up proxy-service
```

## 🔍 API Endpoints

### Health Check

```http
GET /health
```

Возвращает:

```json
{
  "status": "healthy",
  "service": "strangler-fig-proxy",
  "gradual_migration": true,
  "movies_migration_percent": 50,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123456,
  "environment": "development",
  "upstream_services": {
    "monolith": "http://monolith:3280",
    "movies": "http://movies-service:3281",
    "events": "http://events-service:3282"
  }
}
```

### Proxied Requests

Все остальные запросы проксируются в соответствующие upstream сервисы.

## 📊 Мониторинг

### Логи

Сервис выводит детальные логи:

```
🔀 Proxying GET /api/movies to http://movies-service:3281/api/movies
📋 Routing reason: Strangler Fig: 50% migration to microservice
✅ Request completed in 45ms with status 200
```

### Метрики

- Response time в заголовке `X-Response-Time`
- Health check endpoint для monitoring
- Docker health check встроен

## 🧪 Тестирование миграции

### 1. Начальное состояние (0% миграции)

```bash
# Весь трафик в монолит
docker-compose up -d
curl http://localhost:3200/api/movies
```

### 2. Частичная миграция (50% миграции)

```bash
# Изменить MOVIES_MIGRATION_PERCENT в docker-compose.yml
# Перезапустить сервис
docker-compose restart proxy-service

# Половина запросов пойдет в микросервис
for i in {1..10}; do
  curl http://localhost:3200/api/movies
done
```

### 3. Полная миграция (100% миграции)

```bash
# Весь трафик в микросервис
# MOVIES_MIGRATION_PERCENT=100
docker-compose restart proxy-service
curl http://localhost:3200/api/movies
```

## 🔒 Безопасность

- Запуск от непривилегированного пользователя
- Проверка входящих заголовков
- Таймауты для upstream запросов
- Graceful error handling

## 🐛 Отладка

### Проверка состояния

```bash
# Health check
curl http://localhost:3200/health

# Логи контейнера
docker logs cinemaabyss-proxy-service

# Подключение к контейнеру
docker exec -it cinemaabyss-proxy-service sh
```

### Частые проблемы

1. **503 Service Unavailable** - upstream сервис недоступен
2. **504 Gateway Timeout** - таймаут запроса
3. **502 Bad Gateway** - ошибка в upstream сервисе

## 📈 Производительность

- Асинхронная обработка запросов
- Connection pooling для HTTP клиента
- Минимальные накладные расходы на проксирование
- Эффективная обработка ошибок

---

**Готов к продакшн использованию!** 🚀
