#!/bin/bash

# CinemaAbyss Kong Proxy - Start Script
# Скрипт для запуска Kong Gateway с проверками

set -e

echo "🚀 Запуск CinemaAbyss Kong Proxy..."

# Функция для проверки доступности сервиса
check_service() {
    local url=$1
    local service_name=$2
    echo "⏳ Проверка доступности $service_name ($url)..."
    
    for i in {1..30}; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name доступен"
            return 0
        fi
        echo "⏳ Ожидание $service_name... ($i/30)"
        sleep 2
    done
    
    echo "❌ $service_name недоступен после 60 секунд ожидания"
    return 1
}

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    exit 1
fi

# Переход в директорию скрипта
cd "$(dirname "$0")/.."

# Создание .env файла если его нет
if [ ! -f .env ]; then
    echo "📝 Создание .env файла из примера..."
    cp env.example .env
fi

# Проверка существования внешней сети
echo "🔍 Проверка сети cinemaabyss-network..."
if ! docker network ls | grep -q cinemaabyss-network; then
    echo "🌐 Создание внешней сети cinemaabyss-network..."
    docker network create cinemaabyss-network
fi

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down --remove-orphans

# Запуск сервисов
echo "🚀 Запуск Kong Gateway..."
docker-compose up -d

# Проверка статуса контейнеров
echo "📊 Проверка статуса контейнеров..."
sleep 5
docker-compose ps

# Ожидание запуска Kong
echo "⏳ Ожидание запуска Kong..."
check_service "http://localhost:8001/status" "Kong Admin API"

# Проверка Kong Proxy
check_service "http://localhost:8000/" "Kong Proxy"

# Проверка декларативной конфигурации
echo "🔧 Загрузка декларативной конфигурации..."
if curl -s http://localhost:8001/services | grep -q "monolith-service"; then
    echo "✅ Конфигурация Kong загружена успешно"
else
    echo "⚠️  Конфигурация не найдена, попытка загрузки..."
    if [ -f kong.yml ]; then
        curl -X POST http://localhost:8001/config \
            -F config=@kong.yml || echo "⚠️  Не удалось загрузить конфигурацию"
    fi
fi

# Финальные проверки
echo ""
echo "🎉 Kong Gateway успешно запущен!"
echo ""
echo "📋 Доступные сервисы:"
echo "   🌐 Kong Proxy:     http://localhost:8000"
echo "   ⚙️  Kong Admin API: http://localhost:8001"
echo "   🖥  Konga UI:       http://localhost:1337"
echo ""
echo "🧪 Тестовые команды:"
echo "   curl http://localhost:8000/api/movies"
echo "   curl http://localhost:8001/services"
echo ""
echo "📊 Мониторинг:"
echo "   docker-compose logs -f kong"
echo "   curl http://localhost:8001/metrics"
echo ""

# Показ текущих маршрутов
echo "🗺  Настроенные маршруты:"
curl -s http://localhost:8001/routes | jq '.data[] | {name: .name, paths: .paths, service: .service.name}' 2>/dev/null || echo "   (установите jq для форматированного вывода)"

echo ""
echo "✅ Готово к работе!"
