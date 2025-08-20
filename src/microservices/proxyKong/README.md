# CinemaAbyss Kong Proxy

Kong-based API Gateway для микросервисной архитектуры CinemaAbyss с поддержкой канареечных развертываний и постепенной миграции от монолита к микросервисам.

## 🚀 Возможности

- **Канареечные развертывания** - постепенная миграция трафика между сервисами
- **Load Balancing** - распределение нагрузки с весовым алгоритмом
- **Rate Limiting** - ограничение частоты запросов
- **Мониторинг** - Prometheus метрики и детальное логирование
- **Безопасность** - CORS, JWT аутентификация
- **Admin UI** - веб-интерфейс для управления Kong

## 📁 Структура проекта

```
proxyKong/
├── docker-compose.yml      # Основная конфигурация Docker
├── kong.yml               # Декларативная конфигурация Kong
├── env.example           # Пример переменных окружения
├── config/
│   └── kong.conf         # Базовая конфигурация Kong
├── scripts/
│   ├── start.sh          # Скрипт запуска
│   └── kong-config.sh    # Скрипт конфигурации
└── README.md             # Этот файл
```

## 🛠 Быстрый старт

### 1. Подготовка окружения

```bash
# Скопируйте пример переменных окружения
cp env.example .env

# Отредактируйте .env файл при необходимости
nano .env
```

### 2. Запуск Kong

```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f kong
```

### 3. Проверка работоспособности

```bash
# Проверка Kong Admin API
curl -i http://localhost:8001/

# Проверка Kong Proxy
curl -i http://localhost:8000/

# Проверка маршрута фильмов
curl -i http://localhost:8000/api/movies
```

## 🔧 Конфигурация канареечного развертывания

### Настройка процента миграции

В файле `kong.yml` измените веса в секции `upstreams`:

```yaml
upstreams:
  - name: movies-upstream
    targets:
      # Монолит - 30% трафика
      - target: host.docker.internal:3280
        weight: 30
      # Микросервис - 70% трафика
      - target: host.docker.internal:3281
        weight: 70
```

### Динамическое изменение через Admin API

```bash
# Обновление веса монолита (30%)
curl -X PATCH http://localhost:8001/upstreams/movies-upstream/targets/host.docker.internal:3280 \
  -d "weight=30"

# Обновление веса микросервиса (70%)
curl -X PATCH http://localhost:8001/upstreams/movies-upstream/targets/host.docker.internal:3281 \
  -d "weight=70"
```

## 📊 Мониторинг

### Prometheus метрики

Kong экспортирует метрики в формате Prometheus:

```bash
# Получение метрик
curl http://localhost:8001/metrics
```

### Логирование

Все логи доступны через Docker:

```bash
# Логи Kong
docker-compose logs -f kong

# Логи базы данных
docker-compose logs -f kong-database
```

### Admin UI (Konga)

Веб-интерфейс для управления Kong доступен по адресу: http://localhost:1337

## 🔀 Маршрутизация

| Маршрут       | Сервис           | Описание                  |
| ------------- | ---------------- | ------------------------- |
| `/api/movies` | movies-upstream  | Канареечное развертывание |
| `/api/events` | events-service   | Микросервис событий       |
| `/health`     | monolith-service | Health check              |
| `/`           | monolith-service | Всё остальное             |

## 🛡 Безопасность

### Rate Limiting

- `/api/movies` - 100 запросов/мин, 1000 запросов/час
- `/api/events` - 150 запросов/мин, 1500 запросов/час

### CORS

Настроен для всех маршрутов с поддержкой:

- Любые origins (настраивается)
- Стандартные HTTP методы
- Кастомные заголовки для трейсинга

### JWT аутентификация

Настроены consumers для frontend и admin с JWT поддержкой.

## 🧪 Тестирование

### Тестирование канареечного развертывания

```bash
# Отправка 100 запросов для проверки распределения
for i in {1..100}; do
  curl -s http://localhost:8000/api/movies > /dev/null
  echo "Request $i sent"
done

# Анализ логов для проверки распределения
docker-compose logs kong 2>&1 | grep "api/movies" | tail -20
```

### Принудительная маршрутизация

```bash
# Принудительная отправка в монолит
curl -H "X-Kong-Route: monolith" http://localhost:8000/api/movies

# Принудительная отправка в микросервис
curl -H "X-Kong-Route: microservice" http://localhost:8000/api/movies
```

## 🔄 Управление конфигурацией

### DB-less режим (декларативный)

Для использования без базы данных:

1. Измените в `docker-compose.yml`:

```yaml
environment:
  KONG_DATABASE: "off"
  KONG_DECLARATIVE_CONFIG: /kong/kong.yml
```

2. Перезапустите Kong:

```bash
docker-compose down
docker-compose up -d kong
```

### Обновление конфигурации

```bash
# Валидация конфигурации
kong config parse kong.yml

# Применение новой конфигурации (DB-less режим)
curl -X POST http://localhost:8001/config \
  -F config=@kong.yml
```

## 🐛 Отладка

### Проверка состояния Kong

```bash
# Информация о Kong
curl http://localhost:8001/status

# Список сервисов
curl http://localhost:8001/services

# Список маршрутов
curl http://localhost:8001/routes

# Список upstreams
curl http://localhost:8001/upstreams
```

### Проверка подключения к upstream сервисам

```bash
# Health check монолита
curl http://localhost:8001/upstreams/movies-upstream/health

# Список targets
curl http://localhost:8001/upstreams/movies-upstream/targets
```

### Логи и ошибки

```bash
# Детальные логи Kong
docker-compose logs -f kong

# Ошибки базы данных
docker-compose logs -f kong-database

# Проверка конфигурации
docker exec -it proxykong_kong_1 kong config check
```

## 🔗 Полезные ссылки

- [Kong Documentation](https://docs.konghq.com/)
- [Kong Admin API](https://docs.konghq.com/gateway/latest/admin-api/)
- [Kong Plugins](https://docs.konghq.com/hub/)
- [Prometheus Plugin](https://docs.konghq.com/hub/kong-inc/prometheus/)

## 🏗 Сравнение с текущим Node.js прокси

| Характеристика     | Node.js Proxy    | Kong Gateway           |
| ------------------ | ---------------- | ---------------------- |
| Производительность | Средняя          | Высокая                |
| Конфигурация       | Код + перезапуск | Динамическая через API |
| Плагины            | Самописные       | Готовые + кастомные    |
| Мониторинг         | Базовое          | Prometheus + Admin UI  |
| Масштабируемость   | Ограниченная     | Горизонтальная         |
| Enterprise функции | Нет              | Есть                   |
