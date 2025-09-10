# Cours fil rouge Kubernetes – Déploiement de la Todo App

## Objectifs du cours

À la fin de ce module, tu seras capable de :

* Comprendre la différence fondamentale entre **VMs et conteneurs** et leurs cas d'usage respectifs.
* Construire et exécuter une application avec **Docker**.
* Expliquer les grands principes de **Kubernetes** et son architecture et ses avantages.
* Déployer une application réelle (**Todo App**) avec **Pods, Services, Deployments et Ingress**.
* Comprendre les enjeux de l'orchestration en production.

L’application Todo App que nous allons déployer contient :

* Un **frontend** (Nginx qui sert une interface simple).
* Un **backend** (API REST en Node.js + Express, qui gère les tâches).
* Une **base de données Postgres** (stockage persistant des données).

---

# Partie 1 – Bases de la conteneurisation (1h)

---

## 1. Virtualisation vs Conteneurisation (10 min)

### Contexte historique
Avant les conteneurs, les équipes DevOps avaient principalement recours à la virtualisation pour isoler les applications. Cette approche, bien qu'efficace, présentait des limitations importantes que nous allons explorer.

### Explication

**Les machines virtuelles (VMs)** :
Une VM embarque un système d'exploitation complet (OS invité) qui s'exécute au-dessus d'un hyperviseur. Chaque VM dispose de :

* Son propre kernel
* Ses propres drivers
* Sa propre pile réseau
* Ses propres services système (systemd, init, etc.)

Cette approche présente des inconvénients :

* **Lourdeur** : chaque VM peut consommer plusieurs GB de RAM et de stockage
* **Lenteur de démarrage** : 30 secondes à plusieurs minutes selon l'OS
* **Gourmandise** : beaucoup de ressources gaspillées pour les services système dupliqués
* **Complexité de maintenance** : mise à jour de multiples OS

**Les conteneurs** :
Un conteneur partage le kernel de l'OS hôte mais isole les processus application dans des espaces de noms (namespaces) séparés. Cette isolation porte sur :

* **Process ID (PID)** : chaque conteneur voit ses propres processus
* **Network** : interface réseau virtuelle isolée
* **Mount** : système de fichiers isolé
* **UTS** : hostname et domaine séparés
* **IPC** : communication inter-processus isolée
* **User** : mapping des utilisateurs

**Avantages des conteneurs** :

* **Légèreté** : quelques MB à quelques centaines de MB seulement
* **Démarrage rapide** : quelques millisecondes à quelques secondes
* **Efficacité** : partage du kernel, pas de duplication des services système
* **Portabilité** : "Build once, run anywhere" - même environnement du dev à la prod
* **Densité** : possibilité de faire tourner des dizaines/centaines de conteneurs sur une même machine


### Illustration

```
Architecture VM :
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Application   │  │   Application   │  │   Application   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│   Libraries     │  │   Libraries     │  │   Libraries     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│   OS invité     │  │   OS invité     │  │   OS invité     │
│   (Ubuntu)      │  │   (CentOS)      │  │   (Windows)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
┌───────────────────────────────────────────────────────────┐
│                Hyperviseur (VMware, VirtualBox)          │
└───────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────┐
│                    OS Hôte (Linux)                       │
└───────────────────────────────────────────────────────────┘

Architecture Conteneurs :
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Application   │  │   Application   │  │   Application   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│   Libraries     │  │   Libraries     │  │   Libraries     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
┌───────────────────────────────────────────────────────────┐
│            Container Runtime (Docker, containerd)        │
└───────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────┐
│                    OS Hôte (Linux)                       │
└───────────────────────────────────────────────────────────┘
```

### Consigne projet- Analyse comparatives

#### Scénario VM :

* Tu aurais besoin de 3 VMs avec chacune un OS complet
* VM Frontend : Ubuntu + Nginx (4 GB RAM, 20 GB stockage)
* VM Backend : Ubuntu + Node.js (4 GB RAM, 20 GB stockage)
* VM Database : Ubuntu + PostgreSQL (8 GB RAM, 50 GB stockage)
* **Total** : 16 GB RAM, 90 GB stockage pour 3 services

#### Scénario Conteneurs :

* 3 conteneurs légers, chacun spécialisé pour son rôle
* Container Frontend : Nginx Alpine (50 MB RAM, 20 MB stockage)
* Container Backend : Node.js Alpine (200 MB RAM, 100 MB stockage)
* Container Database : PostgreSQL (1 GB RAM, 5 GB stockage + données)
* **Total** : ~1.3 GB RAM, ~200 MB stockage pour les services

#### Questions de réflexion :

* Quelle solution sera la plus simple si tu dois gérer 1000 utilisateurs simultanés ?
* Comment ferais-tu pour scaler rapidement uniquement le backend si la charge API augmente ?
---

## 2. Docker : concepts de base (15 min)

### Explication

Docker repose sur quatre concepts clés :

* **Image** : modèle immuable qui contient le code et les dépendances.
* **Conteneur** : exécution d’une image.
* **Registry** : entrepôt d’images (ex : Docker Hub).
* **Volume** : stockage persistant.

/!\ Attention : si un conteneur meurt, ses données disparaissent (sauf si tu utilises un volume).

### Consigne projet

1. **Backend**

   * Construis l’image :

     ```bash
     cd backend
     docker build -t todo-backend:v1 .
     docker run -p 5000:5000 todo-backend:v1
     ```
   * Vérifie que l’API répond :
     `http://localhost:5000/tasks`

2. **Frontend**

   * Construis l’image :

     ```bash
     cd frontend
     docker build -t todo-frontend:v1 .
     docker run -p 8080:80 todo-frontend:v1
     ```
   * Vérifie :
     `http://localhost:8080`

3. **Base de données**

   * Lance Postgres :

     ```bash
     docker run --name todo-db \
       -e POSTGRES_PASSWORD=todo \
       -e POSTGRES_DB=todo \
       -p 5432:5432 -d postgres:15
     ```

À ce stade, tu as tes **3 conteneurs Docker** séparés.

---

## 3. Orchestration et Kubernetes (10 min)

### Explication

Avec plusieurs conteneurs :

* Comment gérer plusieurs instances du backend ?
* Que se passe-t-il si la DB tombe ?
* Comment exposer frontend + backend sur le même domaine ?

Docker seul ne suffit pas → on a besoin d’un **orchestrateur**.

Kubernetes permet de gérer tout ça automatiquement : déploiement, mise à l’échelle, supervision.

### Consigne projet

Réfléchis : *“Si je devais déployer Todo App en production uniquement avec Docker, quels problèmes aurais-je ?”*

* Pas de redémarrage automatique.
* Pas de montée en charge dynamique.
* Pas de gestion réseau avancée.

---

## 4. Architecture Kubernetes (15 min)

### Explication

Un cluster Kubernetes est composé de :

* **Control Plane** (le cerveau) :

  * `kube-apiserver` : point d’entrée.
  * `etcd` : base de données clé-valeur.
  * `scheduler` : place les Pods sur les bons nœuds.
  * `controller-manager` : surveille et applique les règles.

* **Worker Nodes** (les bras) :

  * `kubelet` : exécute les Pods.
  * `kube-proxy` : gère la connectivité réseau.
  * **runtime conteneur** (containerd, cri-o).

### Consigne projet

1. Lance ton cluster :

   ```bash
   minikube start
   ```
2. Vérifie qu’il est actif :

   ```bash
   kubectl get nodes
   kubectl get pods -A
   ```

Le cluster est prêt à accueillir Todo App.

---

# Partie 2 – Objets de base Kubernetes (2h)

---

## 1. Pods (25 min)

### Explication

Un **Pod** est la plus petite unité déployable dans Kubernetes.

* Contient 1 ou plusieurs conteneurs.
* Partage l’IP et les volumes.
* /!\ Fragile : il peut disparaître et ne pas être relancé.

### Consigne projet

1. Crée un Pod pour le **backend** :

   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: todo-backend
     labels:
       app: todo-backend
   spec:
     containers:
       - name: backend
         image: todo-backend:v1
         ports:
           - containerPort: 5000
   ```

   ```bash
   kubectl apply -f backend-pod.yaml
   kubectl get pods
   ```

2. Fais de même pour le **frontend** et la **DB**.

Question : *“Que se passe-t-il si un Pod crash ?”*

---

## 2. Services (25 min)

### Explication

Les Pods changent d’IP → communication instable.
Solution : un **Service** fournit une IP stable et un nom DNS interne.

Types :

* **ClusterIP** (par défaut, interne).
* **NodePort** (ouvre un port du nœud).
* **LoadBalancer** (cloud).

### Consigne projet

1. Crée un Service pour le **backend** :

   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: todo-backend-svc
   spec:
     selector:
       app: todo-backend
     ports:
       - port: 5000
         targetPort: 5000
   ```

   ```bash
   kubectl apply -f backend-svc.yaml
   kubectl get svc
   ```

2. Crée aussi un Service pour le **frontend** et pour la **DB**.

Teste depuis un Pod temporaire :

```bash
kubectl run curl --image=alpine --restart=Never -it -- sh
apk add curl
curl todo-backend-svc:5000/tasks
```

---

## 3. Deployments (30 min)

### Explication

Un **Deployment** gère :

* Combien de Pods lancer.
* Les mises à jour progressives.
* Les rollbacks.

Relation : **Deployment → ReplicaSet → Pods**.

### Consigne projet

1. Déploie le backend avec un Deployment :

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: todo-backend-deploy
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: todo-backend
     template:
       metadata:
         labels:
           app: todo-backend
       spec:
         containers:
           - name: backend
             image: todo-backend:v1
             ports:
               - containerPort: 5000
   ```

   ```bash
   kubectl apply -f backend-deploy.yaml
   kubectl get pods
   ```

2. Mets à jour l’image du backend :

   ```bash
   kubectl set image deployment/todo-backend-deploy backend=todo-backend:v2
   kubectl rollout status deployment/todo-backend-deploy
   ```

Question : *“Pourquoi ne pas scaler la DB comme le backend ?”*
Réponse attendue : la DB est **stateful**, on verra ça plus tard.

---

## 4. Ingress routes (30 min)

### Explication

Les Services exposent en interne → pour un accès externe, on utilise un **Ingress**.

* Fonctionne comme un reverse proxy.
* Permet de router vers plusieurs Services avec un seul domaine.

### Consigne projet

1. Crée un Service pour le frontend.

2. Crée un Ingress :

   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: todo-ingress
   spec:
     rules:
       - host: todo.local
         http:
           paths:
             - path: /
               pathType: Prefix
               backend:
                 service:
                   name: todo-frontend-svc
                   port:
                     number: 80
             - path: /api
               pathType: Prefix
               backend:
                 service:
                   name: todo-backend-svc
                   port:
                     number: 5000
   ```

   ```bash
   kubectl apply -f ingress.yaml
   kubectl get ingress
   ```

3. Ajoute dans ton fichier `hosts` :

   ```bash
   echo "$(minikube ip) todo.local" | sudo tee -a /etc/hosts
   ```

4. Vérifie :

   * `http://todo.local/` → frontend
   * `http://todo.local/api/tasks` → backend

---

# Conclusion

Dans ce module, tu as appris à :

* Démarrer avec Docker et comprendre la logique des conteneurs.
* Découvrir l’architecture de Kubernetes.
* Déployer la Todo App complète dans un cluster Kubernetes.
* Connecter ses composants avec **Pods, Services, Deployments et Ingress**.

À la fin, ton application Todo App est **accessible via une URL**, exactement comme en production.

Prochaine étape : **la configuration et le stockage** avec ConfigMaps, Secrets et Volumes.

---
