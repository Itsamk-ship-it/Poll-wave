.PHONY: up down build logs seed reset backend frontend infra

## Start the full stack (frontend, backend, postgres, redis)
up:
	docker compose up --build

## Start in the background
upd:
	docker compose up --build -d

## Stop all services
down:
	docker compose down

## Stop and wipe all data volumes
reset:
	docker compose down -v

## Tail logs
logs:
	docker compose logs -f

## Start only Postgres + Redis (for local dev)
infra:
	docker compose up postgres redis -d

## Re-run the seed inside the backend container
seed:
	docker compose exec backend npm run seed
