# Events

Cервис, который отвечает за создание и обработку событий через Apache Kafka.

## API Эндпоинты

### Health Check

- `GET /api/events/health` - проверка состояния сервиса

### События

- `POST /api/events/movie` - создание события фильма
- `POST /api/events/user` - создание события пользователя
- `POST /api/events/payment` - создание события платежа

## Установка и запуск

1. Установите зависимости:

```bash
npm install
```

2. Скопируйте файл конфигурации:

```bash
cp .env.example .env
```

3. Соберите проект:

```bash
npm run build
```

4. Запустите в режиме разработки:

```bash
npm run dev
```

Или запустите собранную версию:

```bash
npm start
```

## Конфигурация

Сервис конфигурируется через переменные окружения:

- `PORT` - порт сервера (по умолчанию 3282)
- `KAFKA_BROKERS` - адреса брокеров Kafka (по умолчанию localhost:9092)
- `KAFKA_TOPIC` - топик Kafka (по умолчанию cinema-events)
- `KAFKA_CLIENT_ID` - идентификатор клиента (по умолчанию events-service)
- `KAFKAJS_NO_PARTITIONER_WARNING` - подавление предупреждений KafkaJS (установить в 1)

## Docker

Сборка образа:

```bash
docker build -t cinemaabyss-events .
```

Запуск контейнера:

```bash
docker run -p 3282:3282 -e KAFKA_BROKERS=kafka:9092 cinemaabyss-events
```

## Технологии

- Node.js
- TypeScript
- Koa.js
- KafkaJS
- Winston (логирование)
