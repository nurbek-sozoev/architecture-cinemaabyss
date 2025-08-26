# Локально

```bash
npm install
npm run dev

npm run build
npm start
```

# Docker

```bash
docker-compose up api-gateway
```

# Gateway endpoints

## Health check

`GET http://localhost:3200/gateway/health`

## Gateway stats

`http://localhost:3200/gateway/stats`

## Балансировка запросов

### MOVIES_MIGRATION_PERCENT = 50

Распределение между сервисами: `A-A-A-A-A-B-B-B-B-B`

### MOVIES_MIGRATION_PERCENT = 20

Распределение между сервисами: `A-A-A-A-A-A-A-A-B-B`
