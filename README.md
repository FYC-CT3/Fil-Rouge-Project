# Cours fil rouge Kubernetes – Déploiement de la Todo App

## Objectifs du cours

À la fin de ce module, tu seras capable de :

* Comprendre la différence fondamentale entre **VMs et conteneurs** et leurs cas d'usage respectifs.
* Construire et exécuter une application avec **Docker**.
* Expliquer les grands principes de **Kubernetes** et son architecture et ses avantages.
* Déployer une application réelle (**Todo App**) avec **Pods, Services, Deployments et Ingress**.
* Comprendre les enjeux de l'orchestration en production.

L'application Todo App que nous allons déployer contient :
- **Un frontend** : Nginx qui sert une interface web simple et moderne
- **Un backend** : API REST en Node.js + Express, qui gère la logique métier des tâches
- **Une base de données** : PostgreSQL pour le stockage persistant et fiable des données

Cette architecture en trois tiers (3-tier architecture) représente un pattern classique d'applications web modernes que tu retrouveras fréquemment en entreprise.

---

## Partie 1 – Bases de la conteneurisation (1h)

### 1. Virtualisation vs Conteneurisation (10 min)

#### Contexte historique

Avant les conteneurs, les équipes DevOps avaient principalement recours à la virtualisation pour isoler les applications. Cette approche, bien qu'efficace, présentait des limitations importantes que nous allons explorer.

#### Explication détaillée

**Les machines virtuelles (VMs) :**
Une VM embarque un système d'exploitation complet (OS invité) qui s'exécute au-dessus d'un hyperviseur. Chaque VM dispose de :
- Son propre kernel
- Ses propres drivers
- Sa propre pile réseau
- Ses propres services système (systemd, init, etc.)

Cette approche présente des inconvénients :
- **Lourdeur** : chaque VM peut consommer plusieurs GB de RAM et de stockage
- **Lenteur de démarrage** : 30 secondes à plusieurs minutes selon l'OS
- **Gourmandise** : beaucoup de ressources gaspillées pour les services système dupliqués
- **Complexité de maintenance** : mise à jour de multiples OS

**Les conteneurs :**
Un conteneur partage le kernel de l'OS hôte mais isole les processus application dans des espaces de noms (namespaces) séparés. Cette isolation porte sur :
- **Process ID (PID)** : chaque conteneur voit ses propres processus
- **Network** : interface réseau virtuelle isolée
- **Mount** : système de fichiers isolé
- **UTS** : hostname et domaine séparés
- **IPC** : communication inter-processus isolée
- **User** : mapping des utilisateurs

Avantages des conteneurs :
- **Légèreté** : quelques MB à quelques centaines de MB seulement
- **Démarrage rapide** : quelques millisecondes à quelques secondes
- **Efficacité** : partage du kernel, pas de duplication des services système
- **Portabilité** : "Build once, run anywhere" - même environnement du dev à la prod
- **Densité** : possibilité de faire tourner des dizaines/centaines de conteneurs sur une même machine

#### Illustration détaillée

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

#### Consigne projet - Analyse comparative

Imagine que tu dois déployer la Todo App (frontend + backend + DB) pour une startup qui grandit rapidement :

**Scénario VM :**
- Tu aurais besoin de 3 VMs avec chacune un OS complet
- VM Frontend : Ubuntu + Nginx (4 GB RAM, 20 GB stockage)
- VM Backend : Ubuntu + Node.js (4 GB RAM, 20 GB stockage)  
- VM Database : Ubuntu + PostgreSQL (8 GB RAM, 50 GB stockage)
- **Total** : 16 GB RAM, 90 GB stockage pour 3 services

**Scénario Conteneurs :**
- 3 conteneurs légers, chacun spécialisé pour son rôle
- Container Frontend : Nginx Alpine (50 MB RAM, 20 MB stockage)
- Container Backend : Node.js Alpine (200 MB RAM, 100 MB stockage)
- Container Database : PostgreSQL (1 GB RAM, 5 GB stockage + données)
- **Total** : ~1.3 GB RAM, ~200 MB stockage pour les services

**Questions de réflexion :**
1. Quelle solution sera la plus simple si tu dois gérer 1000 utilisateurs simultanés ?
2. Comment ferais-tu pour scaler rapidement uniquement le backend si la charge API augmente ?
3. Quel est l'impact économique sur les coûts cloud entre les deux approches ?

### 2. Docker : concepts de base (15 min)

#### Introduction à Docker

Docker a révolutionné le monde du développement en 2013 en standardisant la conteneurisation. Il s'agit d'une plateforme qui permet de créer, déployer et exécuter des applications dans des conteneurs.

#### Explication des concepts clés

Docker repose sur quatre concepts fondamentaux que tout développeur doit maîtriser :

**1. Image Docker**
- **Définition** : Modèle immuable (read-only) qui contient tout le nécessaire pour exécuter une application
- **Contenu** : code source, runtime, bibliothèques, variables d'environnement, fichiers de configuration
- **Structure en couches** : chaque instruction dans le Dockerfile crée une nouvelle couche
- **Avantage** : réutilisation des couches entre images (efficacité de stockage)

```dockerfile
# Exemple de Dockerfile pour le backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**2. Conteneur Docker**
- **Définition** : Instance en cours d'exécution d'une image
- **Analogie** : l'image est la "classe", le conteneur est "l'objet"
- **Cycle de vie** : created → running → stopped → removed
- **Isolation** : processus, réseau, système de fichiers

**3. Registry Docker**
- **Docker Hub** : registry public officiel avec millions d'images
- **Registries privés** : pour les entreprises (AWS ECR, Google GCR, Azure ACR)
- **Commandes** : `docker pull`, `docker push`, `docker search`

**4. Volume Docker**
- **Problème** : données dans un conteneur = éphémères
- **Solution** : volumes pour persister les données
- **Types** : 
  - Volumes nommés (gérés par Docker)
  - Bind mounts (répertoires hôte)
  - tmpfs mounts (en mémoire)

#### ⚠️ Points d'attention critiques

**Persistance des données :**
Si un conteneur meurt (crash, arrêt, suppression), toutes ses données internes disparaissent définitivement. C'est pourquoi :
- Utilise TOUJOURS des volumes pour les données importantes
- Ne stocke jamais de données critiques dans le système de fichiers du conteneur
- Les bases de données DOIVENT utiliser des volumes persistants

**Sécurité :**
- Évite d'exécuter des conteneurs en tant que root
- Scanne tes images pour détecter les vulnérabilités
- Utilise des images de base minimales (Alpine, Distroless)

#### Consigne projet - Containerisation de la Todo App

Nous allons containeriser chaque composant de notre application :

**1. Backend Node.js**

```bash
# Navigue vers le répertoire backend
cd backend

# Examine le Dockerfile
cat Dockerfile

# Construis l'image avec un tag versioned
docker build -t todo-backend:v1 .

# Vérifie que l'image a été créée
docker images | grep todo-backend

# Lance le conteneur
docker run -d -p 5000:5000 --name backend-container todo-backend:v1

# Vérifie que le conteneur fonctionne
docker ps
```

Test de l'API :
```bash
# Test de santé de l'API
curl http://localhost:5000/health
# Résultat attendu : {"status": "OK", "timestamp": "..."}

# Test des endpoints principaux
curl http://localhost:5000/tasks
# Résultat : [] (liste vide au début)

# Test de création d'une tâche
curl -X POST http://localhost:5000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "description": "Ma première tâche"}'
```

**2. Frontend Nginx**

```bash
# Navigue vers le répertoire frontend
cd ../frontend

# Examine la structure
ls -la
# Contient : index.html, style.css, app.js, Dockerfile

# Construis l'image
docker build -t todo-frontend:v1 .

# Lance le conteneur
docker run -d -p 8080:80 --name frontend-container todo-frontend:v1

# Vérifie l'accès
curl -I http://localhost:8080
# Code de retour 200 attendu
```

Test dans le navigateur :
- Ouvre http://localhost:8080
- Vérifie que l'interface se charge correctement
- Note que l'interface ne peut pas encore communiquer avec l'API (problème réseau)

**3. Base de données PostgreSQL**

```bash
# Crée un volume pour persister les données
docker volume create todo-db-data

# Lance PostgreSQL avec le volume
docker run -d \
  --name todo-db \
  -e POSTGRES_PASSWORD=todo123 \
  -e POSTGRES_DB=todoapp \
  -e POSTGRES_USER=todo \
  -v todo-db-data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine

# Vérifie que la DB est prête
docker logs todo-db

# Test de connexion
docker exec -it todo-db psql -U todo -d todoapp -c "\l"
```

**État actuel et limitations :**
À ce stade, tu as tes 3 conteneurs Docker qui fonctionnent séparément, mais ils présentent plusieurs problèmes :
- **Isolation réseau** : les conteneurs ne peuvent pas communiquer entre eux
- **Gestion manuelle** : démarrage/arrêt manuel de chaque conteneur
- **Pas de redémarrage automatique** : si un conteneur crash, il ne redémarre pas
- **Configuration en dur** : les URLs et ports sont fixes

**Nettoyage :**
```bash
# Arrêter tous les conteneurs
docker stop backend-container frontend-container todo-db

# Les supprimer
docker rm backend-container frontend-container todo-db

# Nettoyer les images (optionnel)
docker rmi todo-backend:v1 todo-frontend:v1
```

### 3. Orchestration et Kubernetes (10 min)

#### Le problème de la gestion manuelle des conteneurs

Avec notre expérience précédente, tu as pu constater les limitations de Docker utilisé seul pour une application multi-composants. En production, ces défis sont amplifiés :

**Problèmes de disponibilité :**
- Que se passe-t-il si le conteneur backend crash à 2h du matin ?
- Comment s'assurer que la base de données redémarre automatiquement ?
- Qui surveille la santé de chaque service 24h/7j ?

**Problèmes de montée en charge :**
- Comment gérer 10, 100, 1000 utilisateurs simultanés ?
- Faut-il lancer plus d'instances du backend ou du frontend ?
- Comment répartir la charge entre plusieurs instances ?

**Problèmes de réseau et découverte de services :**
- Comment le frontend trouve-t-il l'IP du backend qui peut changer ?
- Comment exposer l'application sur un même domaine (todo.monsite.com) ?
- Comment gérer les certificats SSL/TLS ?

**Problèmes de mise à jour et rollback :**
- Comment déployer une nouvelle version sans interruption de service ?
- Comment revenir en arrière si la nouvelle version pose problème ?
- Comment faire des déploiements progressifs (blue/green, canary) ?

#### Explication de l'orchestration

L'orchestration de conteneurs répond à ces défis en automatisant :

**1. La planification (Scheduling)**
- Décider sur quel serveur déployer chaque conteneur
- Prendre en compte les ressources disponibles (CPU, RAM)
- Respecter les contraintes de placement (zones de disponibilité)

**2. La gestion du cycle de vie**
- Démarrer/arrêter/redémarrer automatiquement les conteneurs
- Surveiller leur santé et les remplacer si nécessaire
- Gérer les mises à jour rolling sans interruption

**3. La mise en réseau**
- Créer des réseaux virtuels entre conteneurs
- Fournir la découverte de services automatique
- Gérer l'exposition externe avec load balancing

**4. La gestion de la configuration**
- Centraliser les variables d'environnement et secrets
- Permettre des configurations par environnement (dev/staging/prod)
- Gérer les volumes et le stockage persistant

#### Pourquoi Kubernetes ?

Kubernetes (k8s) est devenu LE standard de l'orchestration pour plusieurs raisons :

**Adoption industrielle :**
- Utilisé par Google, Netflix, Spotify, Airbnb, etc.
- Plus de 90% des entreprises Fortune 500 utilisent Kubernetes
- Écosystème riche avec des milliers d'outils compatibles

**Philosophie déclarative :**
- Tu décris l'état désiré (YAML), Kubernetes se charge du reste
- Auto-réparation : le système converge automatiquement vers l'état désiré
- Idempotence : appliquer la même configuration plusieurs fois donne le même résultat

**Extensibilité :**
- API extensible avec des Custom Resources
- Operators pour automatiser la gestion d'applications complexes
- Multi-cloud et hybrid-cloud ready

#### Consigne projet - Réflexion sur les défis

Réfléchis : "Si je devais déployer Todo App en production uniquement avec Docker, quels problèmes aurais-je ?"

**Problèmes identifiés :**

1. **Pas de redémarrage automatique**
   - Si le backend crash, l'application est indisponible
   - Besoin de surveillance 24h/7j ou de scripts de monitoring

2. **Pas de montée en charge dynamique**
   - Impossible de lancer automatiquement plus d'instances selon la charge
   - Risque de surcharge lors des pics de trafic

3. **Pas de gestion réseau avancée**
   - Communication entre conteneurs complexe à configurer
   - Pas de load balancing intégré
   - Gestion manuelle des ports et IPs

4. **Pas de gestion centralisée de la configuration**
   - Secrets en dur dans les conteneurs ou variables d'environnement
   - Difficile de changer la configuration sans rebuild

5. **Déploiements risqués**
   - Pas de rolling updates
   - Pas de rollback automatique
   - Interruption de service lors des mises à jour

6. **Manque d'observabilité**
   - Pas de centralisation des logs
   - Pas de métriques intégrées
   - Difficile de déboguer les problèmes

### 4. Architecture Kubernetes (15 min)

#### Vue d'ensemble de Kubernetes

Kubernetes est un système d'orchestration distribué qui fonctionne selon une architecture maître-esclaves. Il sépare clairement les responsabilités entre le "cerveau" (Control Plane) qui prend les décisions et les "bras" (Worker Nodes) qui exécutent le travail.

#### Explication détaillée du Control Plane (le cerveau)

Le Control Plane contient tous les composants qui gèrent l'état du cluster et prennent les décisions d'orchestration :

**1. kube-apiserver**
- **Rôle** : Point d'entrée unique pour toutes les requêtes au cluster
- **Fonctionnement** : API REST qui valide, authentifie et autorise les requêtes
- **Interactions** : kubectl, interfaces web, autres composants K8s communiquent via cette API
- **Persistance** : Toutes les modifications passent par l'API server avant d'être stockées

**2. etcd**
- **Rôle** : Base de données clé-valeur distribuée et cohérente
- **Contenu** : État complet du cluster (Pods, Services, ConfigMaps, Secrets, etc.)
- **Caractéristiques** : Haute disponibilité, cohérence forte, snapshots pour backup
- **Criticité** : Si etcd est perdu, tout l'état du cluster est perdu

**3. kube-scheduler**
- **Rôle** : Décide sur quel nœud placer chaque nouveau Pod
- **Critères de décision** :
  - Ressources disponibles (CPU, RAM, stockage)
  - Contraintes de placement (node selectors, affinity/anti-affinity)
  - Taints et tolerations
  - Politiques de qualité de service
- **Algorithme** : Scoring complexe pour choisir le meilleur nœud

**4. kube-controller-manager**
- **Rôle** : Ensemble de contrôleurs qui surveillent l'état et appliquent les corrections
- **Contrôleurs principaux** :
  - **Node Controller** : surveille la santé des nœuds
  - **ReplicaSet Controller** : maintient le nombre désiré de Pods
  - **Endpoints Controller** : maintient la liste des endpoints des Services
  - **Service Account Controller** : crée les comptes de service par défaut

#### Explication détaillée des Worker Nodes (les bras)

Chaque Worker Node exécute les Pods et maintient la communication avec le Control Plane :

**1. kubelet**
- **Rôle** : Agent principal qui gère les Pods sur le nœud
- **Responsabilités** :
  - Récupère les spécifications de Pods depuis l'API server
  - Garantit que les conteneurs définis dans les Pods tournent
  - Rapporte l'état des Pods et du nœud au Control Plane
  - Exécute les probes de santé (liveness, readiness, startup)
- **Communication** : Avec l'API server et le container runtime

**2. kube-proxy**
- **Rôle** : Gère la connectivité réseau et le load balancing
- **Fonctionnement** :
  - Maintient les règles réseau sur chaque nœud
  - Redirige le trafic vers les bons Pods via les Services
  - Implémente différents modes : iptables, IPVS, userspace
- **Load Balancing** : Répartit les requêtes entre les Pods d'un même Service

**3. Container Runtime**
- **Rôle** : Exécute et gère les conteneurs
- **Implémentations** :
  - **containerd** : runtime de référence, performant et minimal
  - **CRI-O** : runtime optimisé pour Kubernetes
  - **Docker** : historique, maintenant remplacé par containerd
- **Interface** : Container Runtime Interface (CRI) pour la standardisation

#### Schéma architectural détaillé

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE                           │
│  ┌─────────────────┐  ┌─────────────────┐                │
│  │  kube-apiserver │  │      etcd       │                │
│  │   (API REST)    │  │  (key-value)    │                │
│  └─────────────────┘  └─────────────────┘                │
│  ┌─────────────────┐  ┌─────────────────┐                │
│  │ kube-scheduler  │  │ controller-mgr  │                │
│  │ (placement)     │  │ (état désiré)   │                │
│  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                          │ API calls
                          │
┌─────────────────────────────────────────────────────────────┐
│                    WORKER NODES                            │
│                                                             │
│  Node 1               │            Node 2                  │
│  ┌─────────────────┐  │  ┌─────────────────┐              │
│  │     kubelet     │  │  │     kubelet     │              │
│  │ (agent nœud)    │  │  │ (agent nœud)    │              │
│  └─────────────────┘  │  └─────────────────┘              │
│  ┌─────────────────┐  │  ┌─────────────────┐              │
│  │   kube-proxy    │  │  │   kube-proxy    │              │
│  │ (réseau/LB)     │  │  │ (réseau/LB)     │              │
│  └─────────────────┘  │  └─────────────────┘              │
│  ┌─────────────────┐  │  ┌─────────────────┐              │
│  │ container-runtime│  │  │ container-runtime│              │
│  │ (containerd)    │  │  │ (containerd)    │              │
│  └─────────────────┘  │  └─────────────────┘              │
│                       │                                    │
│  ┌─────────────────┐  │  ┌─────────────────┐              │
│  │     PODS        │  │  │     PODS        │              │
│  │ [frontend] [db] │  │  │   [backend]     │              │
│  └─────────────────┘  │  └─────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

#### Consigne projet - Mise en place de l'environnement

**1. Installation et démarrage du cluster local**

Choisis l'outil adapté à ton environnement :

```bash
# Option A : Minikube (recommandé pour débuter)
minikube start --driver=docker --memory=4096 --cpus=2

# Option B : Kind (Kubernetes in Docker)
kind create cluster --name todo-cluster

# Option C : Docker Desktop (si disponible)
# Activer Kubernetes dans les paramètres Docker Desktop
```

**2. Vérification du cluster**

```bash
# Vérifie que kubectl est configuré
kubectl version --client --short

# Affiche les informations du cluster
kubectl cluster-info

# Liste les nœuds du cluster
kubectl get nodes -o wide
# Résultat attendu : un ou plusieurs nœuds en status "Ready"

# Affiche tous les Pods système
kubectl get pods --all-namespaces
# Tu verras les composants du Control Plane et addons
```

**3. Exploration de l'architecture**

```bash
# Examine les composants du Control Plane
kubectl get pods -n kube-system
# Résultat : etcd, kube-apiserver, kube-controller-manager, kube-scheduler

# Regarde les détails d'un Pod système
kubectl describe pod -n kube-system <nom-du-pod-apiserver>

# Vérifie les événements récents
kubectl get events --sort-by=.metadata.creationTimestamp

# Affiche la configuration actuelle de kubectl
kubectl config view
```

**4. Tests de base**

```bash
# Teste l'API server
kubectl api-versions

# Crée un Pod de test simple
kubectl run test-pod --image=nginx --restart=Never

# Vérifie qu'il démarre
kubectl get pods -w
# Utilise Ctrl+C pour arrêter le watch

# Nettoie
kubectl delete pod test-pod
```

**État du cluster :**
Le cluster est maintenant prêt à accueillir notre Todo App. Dans la prochaine partie, nous découvrirons les objets Kubernetes (Pods, Services, Deployments) qui nous permettront de déployer notre application de manière robuste et scalable.

**Points clés à retenir :**
- Kubernetes suit une architecture distribuée avec séparation claire des responsabilités
- Le Control Plane prend les décisions, les Worker Nodes exécutent
- L'état désiré est stocké dans etcd et maintenu par les controllers
- kubectl est ton interface principale pour interagir avec le cluster

---

Cette première partie t'a donné les bases théoriques et pratiques nécessaires pour comprendre l'écosystème des conteneurs et de Kubernetes. Tu es maintenant prêt à découvrir les objets Kubernetes dans la partie 2 !