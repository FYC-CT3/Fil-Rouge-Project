# Sécurité Kubernetes - Todo App

Ce dossier contient les manifestes Kubernetes pour sécuriser l'application Todo App.

## 📁 Structure des fichiers

| Fichier | Description |
|---------|-------------|
| `serviceaccounts.yaml` | ServiceAccounts pour frontend, backend et database |
| `roles.yaml` | Roles RBAC avec permissions minimales |
| `rolebindings.yaml` | Liaison des Roles aux ServiceAccounts |
| `database-secure.yaml` | Déploiement PostgreSQL sécurisé + Service |
| `backend-secure.yaml` | Déploiement Backend Node.js sécurisé + Service |
| `frontend-secure.yaml` | Déploiement Frontend Nginx sécurisé + Service |

## 🔒 Mesures de sécurité appliquées

### RBAC (Role-Based Access Control)
- Chaque composant a son propre ServiceAccount
- Permissions minimales selon le principe du moindre privilège
- Backend : lecture des ConfigMaps uniquement
- Frontend : lecture des ConfigMaps et Services
- Database : lecture des ConfigMaps uniquement

### SecurityContext
- `runAsNonRoot: true` - Aucun conteneur ne tourne en root
- `allowPrivilegeEscalation: false` - Pas d'escalade de privilèges
- `readOnlyRootFilesystem: true` - Filesystem en lecture seule (frontend/backend)
- `capabilities.drop: ["ALL"]` - Suppression de toutes les capabilities Linux
- `seccompProfile: RuntimeDefault` - Profil seccomp par défaut

### Secrets
- Mot de passe de la base de données stocké dans un Secret Kubernetes
- Pas de credentials en clair dans les fichiers YAML

## 🚀 Déploiement

### Prérequis
- Cluster Kubernetes fonctionnel (minikube/kind)
- kubectl configuré
- Images Docker construites (`todo-backend:v1`, `todo-frontend:v1`)

### Étapes de déploiement

```bash
# 1. Créer les ServiceAccounts
kubectl apply -f serviceaccounts.yaml

# 2. Créer les Roles
kubectl apply -f roles.yaml

# 3. Créer les RoleBindings
kubectl apply -f rolebindings.yaml

# 4. Créer le Secret pour la base de données
kubectl create secret generic db-credentials \
  --from-literal=username=todo \
  --from-literal=password='SuperSecret123!' \
  --from-literal=database-url='postgres://todo:SuperSecret123!@todo-db-svc:5432/todoapp'

# 5. Déployer la Database
kubectl apply -f database-secure.yaml

# 6. Déployer le Backend
kubectl apply -f backend-secure.yaml

# 7. Déployer le Frontend
kubectl apply -f frontend-secure.yaml
```

## ✅ Vérification de la sécurité

### Vérifier que les pods ne sont pas root

```bash
# Frontend
kubectl exec $(kubectl get pod -l app=todo-frontend -o jsonpath='{.items[0].metadata.name}') -- id

# Backend
kubectl exec $(kubectl get pod -l app=todo-backend -o jsonpath='{.items[0].metadata.name}') -- id

# Database
kubectl exec $(kubectl get pod -l app=todo-db -o jsonpath='{.items[0].metadata.name}') -- id
```

### Vérifier le filesystem read-only

```bash
kubectl exec $(kubectl get pod -l app=todo-backend -o jsonpath='{.items[0].metadata.name}') -- touch /test.txt
# Résultat attendu : Read-only file system
```

### Vérifier les permissions RBAC

```bash
# Le backend NE PEUT PAS lire les Secrets
kubectl auth can-i get secrets --as=system:serviceaccount:default:backend-sa
# Résultat attendu : no

# Le backend PEUT lire les ConfigMaps
kubectl auth can-i get configmaps --as=system:serviceaccount:default:backend-sa
# Résultat attendu : yes
```

## 🧹 Nettoyage

```bash
# Supprimer les déploiements
kubectl delete -f frontend-secure.yaml
kubectl delete -f backend-secure.yaml
kubectl delete -f database-secure.yaml

# Supprimer le Secret
kubectl delete secret db-credentials

# Supprimer RBAC
kubectl delete -f rolebindings.yaml
kubectl delete -f roles.yaml
kubectl delete -f serviceaccounts.yaml
```

## 📊 Résultats attendus

| Composant | UID | Filesystem | ServiceAccount |
|-----------|-----|------------|----------------|
| Frontend | 101 (nginx) | Read-only | frontend-sa |
| Backend | 1000 (node) | Read-only | backend-sa |
| Database | 999 (postgres) | Writable | database-sa |
