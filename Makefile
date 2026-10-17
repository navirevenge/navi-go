.PHONY: install dev backend frontend

# Frontend dependencies; run once or after changing frontend/package-lock.json.
install:
	cd frontend && npm ci

# Backend (port 8080) and frontend (port 3000) together. Ctrl+C stops both.
dev:
	$(MAKE) -j2 backend frontend

backend:
	cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local

frontend:
	cd frontend && npm run dev
