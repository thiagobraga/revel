.PHONY: up down lint test build e2e
up:
	docker compose up -d
down:
	docker compose down
lint:
	docker compose exec -T api npm run lint
	docker compose exec -T app npm run lint
test:
	docker compose exec -T api npm run coverage
	docker compose exec -T app npm run coverage
build:
	docker compose exec -T api npm run build
	docker compose exec -T app npm run build
e2e:
	npm --prefix app run test:e2e
