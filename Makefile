start-app:
	docker compose up -d --build

stop-app:
	docker compose down -v

test:
	docker compose run --build --rm --entrypoint "npm run test" frontend

simulate:
	docker compose run --build --rm --entrypoint "npm run simulate" frontend

simulate_hands:
	docker compose run --build --rm \
		--volume "$(CURDIR)/output:/app/output" \
		--entrypoint "npm run simulate_hands" \
		frontend

lock:
	docker run --rm -v "$(CURDIR)":/app -w /app node:24-slim npm install
