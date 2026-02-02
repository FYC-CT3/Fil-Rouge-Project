# Todo App - Fil Rouge pour cours Kubernetes

Structure:
- backend/ : Node.js Express API (connects to Postgres)
- frontend/ : static HTML + JS served by nginx
- db/init.sql : SQL to create DB + table
- docker-compose.yml : run locally (db, backend, frontend)
- k8s/ : Kubernetes manifests (namespace, deployments, services, ingress, secret, configmap, hpa)
- charts/ : Helm chart scaffold (todo-app)

## Local (docker-compose)
1. Build the images:
   - `docker-compose build`
2. Start:
   - `docker-compose up`
3. Frontend will be at http://localhost:8080 and backend at http://localhost:3000
