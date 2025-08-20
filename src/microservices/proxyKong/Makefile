# CinemaAbyss Kong Proxy Makefile

.PHONY: help start stop restart status logs clean config test health migration

# Переменные
KONG_ADMIN_URL = http://localhost:3201
KONG_PROXY_URL = http://localhost:3200

# Цвета для вывода
GREEN = \033[32m
YELLOW = \033[33m
BLUE = \033[34m
RED = \033[31m
NC = \033[0m # No Color

help: ## Показать справку
	@echo "$(BLUE)🔧 CinemaAbyss Kong Proxy$(NC)"
	@echo ""
	@echo "$(GREEN)Доступные команды:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Примеры использования:$(NC)"
	@echo "  make start                    # Запустить Kong"
	@echo "  make migration PERCENT=75     # Установить 75% миграции"
	@echo "  make test COUNT=100           # Отправить 100 тестовых запросов"

start: ## Запустить Kong Gateway
	@echo "$(GREEN)🚀 Запуск Kong Gateway...$(NC)"
	@cd ../../../ && docker-compose --profile kong-proxy up -d

stop: ## Остановить Kong Gateway
	@echo "$(YELLOW)🛑 Остановка Kong Gateway...$(NC)"
	@cd ../../../ && docker-compose --profile kong-proxy down

restart: stop start ## Перезапустить Kong Gateway

status: ## Показать статус Kong
	@echo "$(BLUE)📊 Статус Kong Gateway:$(NC)"
	@./scripts/kong-config.sh status

routes: ## Показать маршруты
	@echo "$(BLUE)🗺️  Маршруты Kong:$(NC)"
	@./scripts/kong-config.sh routes

services: ## Показать сервисы
	@echo "$(BLUE)🔧 Сервисы Kong:$(NC)"
	@./scripts/kong-config.sh services

upstreams: ## Показать upstreams
	@echo "$(BLUE)⚖️  Upstreams Kong:$(NC)"
	@./scripts/kong-config.sh upstreams

targets: ## Показать targets
	@echo "$(BLUE)🎯 Targets Kong:$(NC)"
	@./scripts/kong-config.sh targets

logs: ## Показать логи Kong
	@echo "$(BLUE)📋 Логи Kong:$(NC)"
	@cd ../../../ && docker-compose logs -f kong-gateway

health: ## Проверить здоровье сервисов
	@echo "$(BLUE)🏥 Проверка здоровья сервисов:$(NC)"
	@./scripts/kong-config.sh health

metrics: ## Показать Prometheus метрики
	@echo "$(BLUE)📊 Prometheus метрики:$(NC)"
	@./scripts/kong-config.sh metrics

config: ## Перезагрузить конфигурацию
	@echo "$(YELLOW)🔄 Перезагрузка конфигурации...$(NC)"
	@./scripts/kong-config.sh reload

test: ## Тестировать трафик (make test COUNT=100)
	@echo "$(BLUE)🧪 Тестирование трафика...$(NC)"
	@./scripts/kong-config.sh test-traffic $(COUNT)

migration: ## Установить процент миграции (make migration PERCENT=75)
ifndef PERCENT
	@echo "$(RED)❌ Укажите процент миграции: make migration PERCENT=75$(NC)"
	@exit 1
endif
	@echo "$(GREEN)🔄 Установка миграции: $(PERCENT)%$(NC)"
	@./scripts/kong-config.sh migration $(PERCENT)

# Быстрые команды для установки миграции
migration-0: ## 0% в микросервис (весь трафик в монолит)
	@make migration PERCENT=0

migration-25: ## 25% в микросервис
	@make migration PERCENT=25

migration-50: ## 50% в микросервис
	@make migration PERCENT=50

migration-75: ## 75% в микросервис
	@make migration PERCENT=75

migration-100: ## 100% в микросервис (весь трафик в микросервис)
	@make migration PERCENT=100

# Тестирование конкретных маршрутов
test-movies: ## Тестировать API фильмов
	@echo "$(BLUE)🎬 Тестирование API фильмов...$(NC)"
	@curl -i $(KONG_PROXY_URL)/api/movies

test-events: ## Тестировать API событий
	@echo "$(BLUE)📅 Тестирование API событий...$(NC)"
	@curl -i $(KONG_PROXY_URL)/api/events

test-health: ## Тестировать health check
	@echo "$(BLUE)🏥 Тестирование health check...$(NC)"
	@curl -i $(KONG_PROXY_URL)/health

# Мониторинг
monitor: ## Запустить мониторинг (tail логов)
	@echo "$(BLUE)👀 Мониторинг Kong (Ctrl+C для выхода)...$(NC)"
	@cd ../../../ && docker-compose logs -f kong-gateway

admin-ui: ## Открыть Admin UI в браузере
	@echo "$(GREEN)🖥️  Открытие Kong Admin UI...$(NC)"
	@open http://localhost:1337 || echo "Откройте http://localhost:1337 в браузере"

# Очистка
clean: ## Очистить все данные Kong
	@echo "$(RED)🧹 Очистка данных Kong...$(NC)"
	@cd ../../../ && docker-compose --profile kong-proxy down -v
	@docker volume prune -f

clean-logs: ## Очистить логи
	@echo "$(YELLOW)🧹 Очистка логов...$(NC)"
	@cd ../../../ && docker-compose logs --tail=0 kong-gateway

# Разработка
dev: ## Режим разработки (перезагрузка при изменениях)
	@echo "$(GREEN)💻 Режим разработки...$(NC)"
	@echo "Следите за изменениями kong.yml и перезагружайте конфигурацию"
	@while true; do \
		inotifywait -e modify kong.yml 2>/dev/null && make config || sleep 1; \
	done

# Бэкап и восстановление
backup: ## Создать бэкап конфигурации
	@echo "$(BLUE)💾 Создание бэкапа конфигурации...$(NC)"
	@mkdir -p backups
	@curl -s $(KONG_ADMIN_URL)/config > backups/kong-config-$(shell date +%Y%m%d-%H%M%S).json
	@echo "Бэкап сохранен в папке backups/"

# Информация о проекте
info: ## Показать информацию о проекте
	@echo "$(BLUE)ℹ️  Информация о CinemaAbyss Kong Proxy:$(NC)"
	@echo ""
	@echo "🌐 Эндпоинты:"
	@echo "  Kong Proxy:     $(KONG_PROXY_URL)"
	@echo "  Kong Admin API: $(KONG_ADMIN_URL)"
	@echo "  Konga UI:       http://localhost:1337"
	@echo ""
	@echo "📁 Структура:"
	@tree -I 'node_modules|.git' . 2>/dev/null || ls -la
	@echo ""
	@echo "🔧 Конфигурация:"
	@echo "  Файл конфигурации: kong.yml"
	@echo "  Docker Compose:    docker-compose.yml"
	@echo "  Переменные:        .env (создается из env.example)"

# Валидация
validate: ## Валидировать конфигурацию Kong
	@echo "$(BLUE)✅ Валидация конфигурации Kong...$(NC)"
	@docker run --rm -v $(PWD)/kong.yml:/kong.yml kong:3.4-alpine kong config parse /kong.yml

# Быстрый старт для новых пользователей
quick-start: ## Быстрый старт (установка + запуск + тесты)
	@echo "$(GREEN)🚀 Быстрый старт CinemaAbyss Kong Proxy...$(NC)"
	@make start
	@sleep 10
	@make health
	@make test-movies
	@echo "$(GREEN)✅ Готово! Kong Proxy запущен и протестирован$(NC)"
