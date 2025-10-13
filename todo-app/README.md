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

## Kubernetes (minikube / kind)
- Build and load images into your cluster (minikube):
  - `eval $(minikube docker-env)`
  - `docker build -t todo-backend:latest ./backend`
  - `docker build -t todo-frontend:latest ./frontend`
- Apply manifests:
  - `kubectl apply -f k8s/namespace.yaml`
  - `kubectl apply -f k8s/secret.yaml -n todo`
  - `kubectl apply -f k8s/configmap.yaml -n todo`
  - `kubectl apply -f k8s/postgres-deployment.yaml -n todo`
  - `kubectl apply -f k8s/postgres-service.yaml -n todo`
  - `kubectl apply -f k8s/backend-deployment.yaml -n todo`
  - `kubectl apply -f k8s/backend-service.yaml -n todo`
  - `kubectl apply -f k8s/frontend-deployment.yaml -n todo`
  - `kubectl apply -f k8s/frontend-service.yaml -n todo`
  - `kubectl apply -f k8s/ingress.yaml -n todo`
- Notes:
  - Postgres in this example uses an emptyDir for simplicity in K8s demos (not persistent).
  - For production, use PVC + StorageClass.

## Helm
- Chart is in `charts/todo-app`.
- `helm install todo ./charts/todo-app`

## Next steps for course
- Add ConfigMaps/Secrets for different environments
- Replace emptyDir with PVC
- Package with Helm and add templating for resources and replicas
- Add NetworkPolicy, RBAC, SecurityContext, HPA (templates provided)

