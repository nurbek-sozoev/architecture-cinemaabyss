# 🐒 Kong Gateway для CinemaAbyss

Kong Gateway интегрирован в основной `docker-compose.yml` как альтернатива Node.js прокси.

## 🚀 Запуск Kong Gateway

### Базовая инфраструктура (обязательно сначала)

```bash
# Запустить базовые сервисы (PostgreSQL, Kafka, монолит, микросервисы)
docker-compose up -d postgres kafka zookeeper monolith movies-service

# Проверить что базовые сервисы запущены
docker-compose ps
```

### Запуск Kong Gateway

```bash
# Запустить Kong Gateway (с базой данных и админ UI)
docker-compose --profile kong-proxy up -d

# Или только Kong без UI
docker-compose --profile kong-proxy up -d kong-database kong-bootstrap kong-gateway

# Проверить статус Kong
docker-compose ps kong-gateway kong-database
```

### Запуск с Admin UI (Konga)

```bash
# Запустить Kong + Admin UI
docker-compose --profile kong-proxy --profile kong-ui up -d

# Или все вместе одной командой
docker-compose --profile kong-proxy --profile kong-ui up -d
```

## 🔄 Переключение между прокси

### Использовать Node.js прокси

```bash
# Остановить Kong
docker-compose --profile kong-proxy down

# Запустить Node.js прокси
docker-compose --profile nodejs-proxy up -d proxy-service
```

### Использовать Kong Gateway

```bash
# Остановить Node.js прокси
docker-compose --profile nodejs-proxy down

# Запустить Kong
docker-compose --profile kong-proxy up -d
```

## 🌐 Доступные эндпоинты

После запуска Kong доступны следующие сервисы:

- **Kong Proxy**: http://localhost:3200 (тот же порт, что и Node.js прокси)
- **Kong Admin API**: http://localhost:3201
- **Konga Admin UI**: http://localhost:1337

## 🧪 Тестирование

```bash
# Проверка Kong Admin API
curl http://localhost:3201/

# Проверка Kong Proxy
curl http://localhost:3200/

# Тест API фильмов через Kong
curl http://localhost:3200/api/movies

# Проверка конфигурации Kong
curl http://localhost:3201/services
```

## ⚖️ Управление канареечным развертыванием

### Через Admin API

```bash
# Получить список upstreams
curl http://localhost:3201/upstreams

# Изменить вес монолита на 25% (75% в микросервис)
curl -X PATCH http://localhost:3201/upstreams/movies-upstream/targets/monolith:3280 \
  -d "weight=25"

# Изменить вес микросервиса на 75%
curl -X PATCH http://localhost:3201/upstreams/movies-upstream/targets/movies-service:3281 \
  -d "weight=75"

# Проверить текущие веса
curl http://localhost:3201/upstreams/movies-upstream/targets
```

### Через скрипты (из папки proxyKong)

```bash
cd src/microservices/proxyKong

# Установить 75% миграции в микросервис
./scripts/kong-config.sh migration 75

# Проверить здоровье сервисов
./scripts/kong-config.sh health

# Отправить тестовые запросы
./scripts/kong-config.sh test-traffic 100
```

## 📊 Мониторинг

```bash
# Просмотр логов Kong
docker-compose logs -f kong-gateway

# Prometheus метрики
curl http://localhost:3201/metrics

# Статус Kong
curl http://localhost:3201/status
```

## 🛠 Отладка

### Проверка запуска

```bash
# Проверить все контейнеры
docker-compose ps

# Логи Kong Gateway
docker-compose logs kong-gateway

# Логи Kong Database
docker-compose logs kong-database

# Проверить сеть
docker network ls | grep cinemaabyss
```

### Решение проблем

1. **Kong не запускается**:

   ```bash
   # Проверить логи bootstrap
   docker-compose logs kong-bootstrap

   # Пересоздать Kong с чистой базой
   docker-compose --profile kong-proxy down -v
   docker-compose --profile kong-proxy up -d
   ```

2. **Конфигурация не загружается**:

   ```bash
   # Проверить путь к kong.yml
   docker-compose exec kong-gateway ls -la /kong/

   # Валидировать конфигурацию
   docker run --rm -v $(pwd)/src/microservices/proxyKong/kong.yml:/kong.yml \
     kong:3.4-alpine kong config parse /kong.yml
   ```

3. **Upstream сервисы недоступны**:

   ```bash
   # Проверить доступность монолита
   curl http://localhost:3280/health

   # Проверить доступность микросервиса
   curl http://localhost:3281/health

   # Проверить через Kong
   curl http://localhost:3201/upstreams/movies-upstream/health
   ```

## 🔧 Полезные команды

```bash
# Полный перезапуск Kong
docker-compose --profile kong-proxy down
docker-compose --profile kong-proxy up -d

# Обновить конфигурацию Kong без рестарта (DB-less режим)
curl -X POST http://localhost:3201/config \
  -F config=@src/microservices/proxyKong/kong.yml

# Проверить все маршруты
curl http://localhost:3201/routes | jq '.'

# Проверить все сервисы
curl http://localhost:3201/services | jq '.'
```
