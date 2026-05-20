IMAGE   := thinking-machines:test
CONTAINER := tm
PORT    := 8080
ENV_FILE := .env

# Pass --env-file only when .env exists (keeps it working without one too)
ENV_FLAG := $(if $(wildcard $(ENV_FILE)),--env-file $(ENV_FILE),)

.PHONY: build run restart stop logs shell

build:
	docker build -t $(IMAGE) .

run: stop
	docker run -d \
		--name $(CONTAINER) \
		-p $(PORT):8080 \
		$(ENV_FLAG) \
		$(IMAGE)
	@echo "Container started — http://localhost:$(PORT)"
	@sleep 3 && docker logs $(CONTAINER) --tail 10

restart: build run

stop:
	@docker stop $(CONTAINER) 2>/dev/null || true
	@docker rm   $(CONTAINER) 2>/dev/null || true

logs:
	docker logs -f $(CONTAINER)

shell:
	docker exec -it $(CONTAINER) /bin/bash
