#!/bin/bash

# CinemaAbyss Kong Configuration Management Script
# Скрипт для управления конфигурацией Kong и канареечными развертываниями

set -e

KONG_ADMIN_URL="http://localhost:3201"

# Функция для вывода справки
show_help() {
    echo "🔧 CinemaAbyss Kong Configuration Manager"
    echo ""
    echo "Использование: $0 [команда] [параметры]"
    echo ""
    echo "Команды:"
    echo "  status                    - Показать состояние Kong"
    echo "  routes                    - Показать все маршруты"
    echo "  services                  - Показать все сервисы"
    echo "  upstreams                 - Показать все upstreams"
    echo "  targets                   - Показать targets для upstreams"
    echo "  migration [процент]       - Установить процент миграции (0-100)"
    echo "  health                    - Проверить здоровье всех сервисов"
    echo "  metrics                   - Показать Prometheus метрики"
    echo "  reload                    - Перезагрузить конфигурацию из kong.yml"
    echo "  test-traffic [количество] - Отправить тестовые запросы"
    echo "  logs                      - Показать логи Kong"
    echo ""
    echo "Примеры:"
    echo "  $0 migration 75           # 75% трафика в микросервис"
    echo "  $0 test-traffic 100       # Отправить 100 тестовых запросов"
    echo "  $0 health                 # Проверить здоровье сервисов"
}

# Функция для проверки доступности Kong
check_kong() {
    if ! curl -s "$KONG_ADMIN_URL/status" > /dev/null; then
        echo "❌ Kong недоступен на $KONG_ADMIN_URL"
        echo "Запустите Kong с помощью: ./scripts/start.sh"
        exit 1
    fi
}

# Показать состояние Kong
show_status() {
    echo "📊 Состояние Kong Gateway:"
    curl -s "$KONG_ADMIN_URL/status" | jq '.' || echo "Состояние получено (установите jq для форматирования)"
}

# Показать маршруты
show_routes() {
    echo "🗺  Настроенные маршруты:"
    curl -s "$KONG_ADMIN_URL/routes" | jq '.data[] | {name: .name, paths: .paths, methods: .methods, service: .service.name}' || echo "Маршруты получены (установите jq для форматирования)"
}

# Показать сервисы
show_services() {
    echo "🔧 Настроенные сервисы:"
    curl -s "$KONG_ADMIN_URL/services" | jq '.data[] | {name: .name, url: .url, tags: .tags}' || echo "Сервисы получены (установите jq для форматирования)"
}

# Показать upstreams
show_upstreams() {
    echo "⚖️  Настроенные upstreams:"
    curl -s "$KONG_ADMIN_URL/upstreams" | jq '.data[] | {name: .name, algorithm: .algorithm, tags: .tags}' || echo "Upstreams получены (установите jq для форматирования)"
}

# Показать targets
show_targets() {
    echo "🎯 Targets для upstreams:"
    
    upstreams=$(curl -s "$KONG_ADMIN_URL/upstreams" | jq -r '.data[].name' 2>/dev/null || echo "movies-upstream")
    
    for upstream in $upstreams; do
        echo ""
        echo "📍 Upstream: $upstream"
        curl -s "$KONG_ADMIN_URL/upstreams/$upstream/targets" | jq '.data[] | {target: .target, weight: .weight, health: .health}' 2>/dev/null || echo "   Targets получены (установите jq для форматирования)"
    done
}

# Установить процент миграции
set_migration() {
    local percent=$1
    
    if [[ ! $percent =~ ^[0-9]+$ ]] || [ $percent -lt 0 ] || [ $percent -gt 100 ]; then
        echo "❌ Неверный процент: $percent. Используйте число от 0 до 100"
        exit 1
    fi
    
    local monolith_weight=$((100 - percent))
    local microservice_weight=$percent
    
    echo "🔄 Установка миграции: $percent% в микросервис, $monolith_weight% в монолит"
    
    # Обновление весов targets
    echo "⚖️  Обновление веса монолита: $monolith_weight"
    curl -s -X PATCH "$KONG_ADMIN_URL/upstreams/movies-upstream/targets/monolith:3280" \
        -d "weight=$monolith_weight" || echo "Не удалось обновить вес монолита"
    
    echo "⚖️  Обновление веса микросервиса: $microservice_weight"
    curl -s -X PATCH "$KONG_ADMIN_URL/upstreams/movies-upstream/targets/movies-service:3281" \
        -d "weight=$microservice_weight" || echo "Не удалось обновить вес микросервиса"
    
    echo "✅ Миграция настроена: $percent% трафика направляется в микросервис"
    
    # Показать текущие веса
    show_targets
}

# Проверить здоровье сервисов
check_health() {
    echo "🏥 Проверка здоровья сервисов:"
    
    # Проверка монолита
    echo "🔍 Монолит (localhost:3280):"
    if curl -s "http://localhost:3280/health" > /dev/null 2>&1; then
        echo "  ✅ Доступен"
    else
        echo "  ❌ Недоступен"
    fi
    
    # Проверка микросервиса фильмов
    echo "🔍 Микросервис фильмов (localhost:3281):"
    if curl -s "http://localhost:3281/health" > /dev/null 2>&1; then
        echo "  ✅ Доступен"
    else
        echo "  ❌ Недоступен"
    fi
    
    # Проверка микросервиса событий
    echo "🔍 Микросервис событий (localhost:3282):"
    if curl -s "http://localhost:3282/health" > /dev/null 2>&1; then
        echo "  ✅ Доступен"
    else
        echo "  ❌ Недоступен"
    fi
    
    # Kong health check
    echo "🔍 Kong Upstream health:"
    curl -s "$KONG_ADMIN_URL/upstreams/movies-upstream/health" | jq '.' 2>/dev/null || echo "  Данные получены (установите jq для форматирования)"
}

# Показать метрики
show_metrics() {
    echo "📊 Prometheus метрики Kong:"
    curl -s "$KONG_ADMIN_URL/metrics"
}

# Перезагрузить конфигурацию
reload_config() {
    echo "🔄 Перезагрузка конфигурации из kong.yml..."
    
    if [ ! -f kong.yml ]; then
        echo "❌ Файл kong.yml не найден"
        exit 1
    fi
    
    # Для DB-less режима
    curl -X POST "$KONG_ADMIN_URL/config" \
        -F config=@kong.yml && echo "✅ Конфигурация перезагружена"
}

# Тестирование трафика
test_traffic() {
    local count=${1:-10}
    
    echo "🧪 Отправка $count тестовых запросов к /api/movies..."
    
    local monolith_count=0
    local microservice_count=0
    
    for i in $(seq 1 $count); do
        response=$(curl -s -w "%{http_code}" "http://localhost:3200/api/movies" -o /dev/null)
        
        if [ "$response" = "200" ]; then
            echo -n "✅"
        else
            echo -n "❌"
        fi
        
        # Простая имитация подсчета (в реальности нужно анализировать логи)
        if [ $((i % 2)) -eq 0 ]; then
            ((microservice_count++))
        else
            ((monolith_count++))
        fi
        
        sleep 0.1
    done
    
    echo ""
    echo "📊 Результаты тестирования:"
    echo "  Всего запросов: $count"
    echo "  Успешных: ✅"
    echo "  Неудачных: ❌"
    echo ""
    echo "💡 Для детальной статистики анализируйте логи Kong"
}

# Показать логи
show_logs() {
    echo "📋 Логи Kong (последние 50 строк):"
    docker-compose logs --tail=50 kong
}

# Основная логика
case ${1:-help} in
    "status")
        check_kong
        show_status
        ;;
    "routes")
        check_kong
        show_routes
        ;;
    "services")
        check_kong
        show_services
        ;;
    "upstreams")
        check_kong
        show_upstreams
        ;;
    "targets")
        check_kong
        show_targets
        ;;
    "migration")
        check_kong
        set_migration "$2"
        ;;
    "health")
        check_kong
        check_health
        ;;
    "metrics")
        check_kong
        show_metrics
        ;;
    "reload")
        check_kong
        reload_config
        ;;
    "test-traffic")
        check_kong
        test_traffic "$2"
        ;;
    "logs")
        show_logs
        ;;
    "help"|*)
        show_help
        ;;
esac
