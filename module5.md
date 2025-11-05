# Module 5 : Sécurité Kubernetes

## Objectifs du module

À la fin de ce module, tu seras capable de :

* Comprendre et implémenter **RBAC** (Role-Based Access Control) pour contrôler les accès
* Sécuriser tes Pods avec **SecurityContext** et le principe du moindre privilège
* Gérer les **Secrets** de manière sécurisée (mots de passe, tokens, certificats)
* Appliquer les **Pod Security Standards** pour renforcer la sécurité du cluster
* Comprendre les enjeux de sécurité en production et appliquer les bonnes pratiques

---

## Partie 1 – RBAC : Contrôle d'accès (40 min)

### 1. Le problème de sécurité (5 min)

#### Situation par défaut : un danger silencieux

Par défaut, dans Kubernetes, **tous les Pods ont accès à l'API server**. Cela signifie qu'un Pod compromis peut potentiellement :
- Lire tous les Secrets du cluster (mots de passe, tokens)
- Créer ou supprimer des ressources
- Escalader ses privilèges
- Compromettre l'ensemble du cluster

**Démonstration du risque :**

```bash
# Lance un Pod avec kubectl intégré
kubectl run test-pod --image=bitnami/kubectl -- sleep 3600

# Accède au Pod et liste TOUS les secrets du cluster
kubectl exec -it test-pod -- kubectl get secrets --all-namespaces

# Résultat : accès total aux données sensibles !
```

**Analogie :** C'est comme donner les clés de l'entreprise à tous les employés, y compris les stagiaires et les visiteurs.

---

### 2. RBAC : La solution (10 min)

#### Qu'est-ce que RBAC ?

**Role-Based Access Control** (RBAC) est un système d'autorisation qui permet de définir **qui** peut faire **quoi** sur **quelles ressources**.

#### Le principe du moindre privilège

> *"Donner UNIQUEMENT les permissions nécessaires, rien de plus."*

- Commencer par **zéro permission**
- Ajouter les droits au fur et à mesure des besoins
- Séparer les responsabilités (principe de ségrégation)

#### Architecture RBAC

```
┌─────────────────────────────────────────┐
│           API Server                    │
└─────────────────────────────────────────┘
              ↑
              │ Requête : "list pods"
              │
┌─────────────┴─────────────┐
│  1. Authentification      │  ← Qui es-tu ?
│  (ServiceAccount token)   │
└─────────────┬─────────────┘
              │
┌─────────────┴─────────────┐
│  2. Autorisation (RBAC)   │  ← Que peux-tu faire ?
│  Vérifie Role/RoleBinding │
└─────────────┬─────────────┘
              │
         Autorisé / Refusé
```

#### Les 4 objets RBAC

| Objet | Scope | Description |
|-------|-------|-------------|
| **Role** | Namespace | Définit des permissions dans un namespace spécifique |
| **ClusterRole** | Cluster | Définit des permissions globales ou sur ressources non-namespacées |
| **RoleBinding** | Namespace | Lie un Role à des utilisateurs/ServiceAccounts |
| **ClusterRoleBinding** | Cluster | Lie un ClusterRole à des utilisateurs/ServiceAccounts |

#### Schéma des relations

```
Qui fait quoi ?

Subject (Qui ?)          Verb (Fait quoi ?)       Resource (Sur quoi ?)
     ↓                          ↓                         ↓
ServiceAccount             get, list,                  Pods
User                       create, delete              Secrets
Group                      update, patch               ConfigMaps
                                                       Services
```

---

### 3. Pratique guidée : Créer un utilisateur restreint (25 min)

#### Étape 1 : Créer un ServiceAccount

Un ServiceAccount est une identité pour les Pods.

**Fichier : `todo-backend-sa.yaml`**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: todo-backend-sa
  namespace: default
```

```bash
kubectl apply -f todo-backend-sa.yaml
kubectl get serviceaccounts
```

---

#### Étape 2 : Créer un Role avec permissions minimales

Ce Role autorise uniquement à **lire** les Pods et ConfigMaps.

**Fichier : `pod-reader-role.yaml`**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: default
rules:
# Permission de lire les Pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
# Permission de lire les ConfigMaps
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get"]
```

**Explication des verbes :**
- `get` : lire une ressource spécifique
- `list` : lister toutes les ressources
- `create` : créer une nouvelle ressource
- `update` : modifier une ressource existante
- `patch` : modifier partiellement
- `delete` : supprimer une ressource

```bash
kubectl apply -f pod-reader-role.yaml
kubectl get roles
```

---

#### Étape 3 : Créer un RoleBinding

Le RoleBinding **lie** le Role au ServiceAccount.

**Fichier : `pod-reader-binding.yaml`**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods-binding
  namespace: default
subjects:
# Le ServiceAccount qui reçoit les permissions
- kind: ServiceAccount
  name: todo-backend-sa
  namespace: default
roleRef:
  # Le Role à attribuer
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f pod-reader-binding.yaml
kubectl get rolebindings
```

---

#### Étape 4 : Tester les permissions

**1. Déployer un Pod avec le ServiceAccount restreint**

```bash
kubectl run test-rbac --image=bitnami/kubectl \
  --serviceaccount=todo-backend-sa \
  -- sleep 3600
```

**2. Tester ce qui est autorisé**

```bash
# AUTORISÉ : lire les Pods
kubectl exec -it test-rbac -- kubectl get pods
# Résultat : liste des Pods

# AUTORISÉ : lire les ConfigMaps
kubectl exec -it test-rbac -- kubectl get configmaps
# Résultat : liste des ConfigMaps

# REFUSÉ : lire les Secrets
kubectl exec -it test-rbac -- kubectl get secrets
# Error from server (Forbidden): secrets is forbidden

# REFUSÉ : créer un Pod
kubectl exec -it test-rbac -- kubectl run nginx --image=nginx
# Error from server (Forbidden): pods is forbidden
```

**Résultat :** Le ServiceAccount a UNIQUEMENT les permissions définies dans le Role. Rien de plus !

---

#### Exercice pratique (autonomie)

**Mission :** Créer un ServiceAccount pour le frontend qui peut :
- Lire les ConfigMaps
- Lister les Services
- **MAIS PAS** créer de Pods ni lire les Secrets

**Étapes :**
1. Créer un ServiceAccount `todo-frontend-sa`
2. Créer un Role `frontend-reader` avec les bonnes permissions
3. Créer un RoleBinding pour lier les deux
4. Tester avec un Pod temporaire

**Solution :**

```yaml
# frontend-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: todo-frontend-sa
  namespace: default
---
# frontend-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: frontend-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list"]
---
# frontend-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: frontend-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: todo-frontend-sa
  namespace: default
roleRef:
  kind: Role
  name: frontend-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## Partie 2 – SecurityContext : Sécuriser les conteneurs (40 min)

### 1. Le problème : conteneurs en root (5 min)

#### Démonstration du risque

Par défaut, les conteneurs s'exécutent en tant que **root** (UID 0). C'est dangereux !

```bash
# Lance un Pod standard
kubectl run vuln-pod --image=nginx

# Vérifie l'utilisateur
kubectl exec -it vuln-pod -- whoami
# Output: root

# Accède à des fichiers système sensibles
kubectl exec -it vuln-pod -- cat /etc/shadow
# Accessible (très dangereux !)
```

**Pourquoi c'est grave ?**
- Si le conteneur est compromis, l'attaquant a les privilèges root
- Possibilité d'escalade de privilèges sur le nœud
- Accès à tous les fichiers sensibles du conteneur

**Analogie :** C'est comme donner les droits administrateur Windows à tous les programmes, même les jeux et les logiciels non fiables.

---

### 2. SecurityContext : La solution (10 min)

#### Qu'est-ce que SecurityContext ?

Le SecurityContext permet de définir des **contraintes de sécurité** pour les Pods et conteneurs.

#### Les deux niveaux de configuration

```
Pod Level (s'applique à tous les conteneurs)
    ↓
Container Level (surcharge le Pod level)
```

#### Paramètres clés de SecurityContext

| Paramètre | Impact | Valeur recommandée |
|-----------|--------|-------------------|
| `runAsNonRoot` | Force l'exécution en utilisateur non-root | `true` |
| `runAsUser` | Définit l'UID de l'utilisateur | `1000` (ou autre non-root) |
| `runAsGroup` | Définit le GID du groupe | `1000` |
| `fsGroup` | Définit le groupe propriétaire des volumes | `1000` |
| `allowPrivilegeEscalation` | Empêche l'escalade de privilèges | `false` |
| `readOnlyRootFilesystem` | FS racine en lecture seule | `true` (si possible) |
| `capabilities.drop` | Retire des capacités Linux | `["ALL"]` |
| `capabilities.add` | Ajoute des capacités spécifiques | `["NET_BIND_SERVICE"]` (si besoin) |

#### Comprendre les Linux Capabilities

Les capabilities sont des **permissions granulaires** sous Linux :

- `CAP_NET_ADMIN` : Gérer la configuration réseau
- `CAP_SYS_ADMIN` : Presque tous les privilèges (dangereux)
- `CAP_NET_BIND_SERVICE` : Écouter sur les ports < 1024
- `CAP_CHOWN` : Changer le propriétaire de fichiers

**Bonne pratique :** Supprimer TOUTES les capabilities (`drop: ["ALL"]`), puis ajouter uniquement celles nécessaires.

---

### 3. Pratique guidée : Sécuriser un Pod (20 min)

#### Étape 1 : SecurityContext basique

**Fichier : `secure-pod.yaml`**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  # SecurityContext au niveau Pod
  securityContext:
    runAsNonRoot: true    # Force user non-root
    runAsUser: 1000       # UID de l'utilisateur
    runAsGroup: 1000      # GID du groupe
    fsGroup: 1000         # Groupe pour les volumes
  
  containers:
  - name: app
    image: nginx:alpine
    
    # SecurityContext au niveau conteneur
    securityContext:
      allowPrivilegeEscalation: false  # Pas d'escalade
      capabilities:
        drop:
        - ALL  # Retire toutes les capabilities
```

**Déploiement et test :**

```bash
kubectl apply -f secure-pod.yaml

# Vérifie l'utilisateur
kubectl exec -it secure-pod -- id
# Output: uid=1000 gid=1000

# Tente d'accéder à des fichiers sensibles
kubectl exec -it secure-pod -- cat /etc/shadow
# Permission denied
```

---

#### Étape 2 : Filesystem en lecture seule

Pour une sécurité maximale, monte le système de fichiers racine en **lecture seule**.

**Fichier : `readonly-pod.yaml`**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readonly-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  
  containers:
  - name: app
    image: nginx:alpine
    
    securityContext:
      readOnlyRootFilesystem: true  # FS en lecture seule
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
    
    # Nginx a besoin d'écrire dans /tmp et /var/cache
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run
  
  # Volumes temporaires pour les écritures nécessaires
  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

```bash
kubectl apply -f readonly-pod.yaml

# Vérifie que le Pod fonctionne
kubectl get pod readonly-pod

# Tente d'écrire dans le système de fichiers
kubectl exec -it readonly-pod -- touch /test.txt
# Read-only file system
```

---

#### Étape 3 : Sécuriser le Pod todo-backend

Appliquons maintenant ces principes à notre Todo App.

**Fichier : `todo-backend-secure-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-backend-secure
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
      # Utiliser le ServiceAccount restreint créé précédemment
      serviceAccountName: todo-backend-sa
      
      # SecurityContext au niveau Pod
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      
      containers:
      - name: backend
        image: todo-backend:v1
        
        ports:
        - containerPort: 5000
        
        # SecurityContext au niveau conteneur
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        
        # Variables d'environnement
        env:
        - name: PORT
          value: "5000"
        
        # Volume pour les écritures temporaires
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      
      volumes:
      - name: tmp
        emptyDir: {}
```

```bash
kubectl apply -f todo-backend-secure-deployment.yaml

# Vérifie le déploiement
kubectl get pods -l app=todo-backend

# Vérifie la sécurité
kubectl exec -it <pod-name> -- id
# Output: uid=1000 gid=1000
```

---

#### Exercice pratique (autonomie)

**Mission :** Sécuriser le Pod todo-frontend avec :
- Exécution en utilisateur 1000
- Pas d'escalade de privilèges
- Filesystem en lecture seule (avec volumes temporaires pour Nginx)
- Retrait de toutes les capabilities

**Indice :** Nginx a besoin d'écrire dans `/tmp`, `/var/cache/nginx` et `/var/run`.

---

## Partie 3 – Secrets Management (25 min)

### 1. Le problème : secrets en clair (5 min)

#### Les erreurs courantes

**Mauvaise pratique n°1 : Mot de passe en clair dans le YAML**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bad-practice
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: DB_PASSWORD
      value: "super-secret-password-123"  # En clair !
```

**Problèmes :**
- Visible dans Git (historique conservé à jamais)
- Visible avec `kubectl describe pod`
- Visible dans les logs et événements
- Accessible par tous ceux qui ont accès au cluster

**Mauvaise pratique n°2 : Base64 n'est pas du chiffrement**

```bash
echo "super-secret-password-123" | base64
# c3VwZXItc2VjcmV0LXBhc3N3b3JkLTEyMwo=

# Facilement décodable
echo "c3VwZXItc2VjcmV0LXBhc3N3b3JkLTEyMwo=" | base64 -d
# super-secret-password-123
```

Base64 est de l'**encodage**, pas du **chiffrement** !

---

### 2. Les Secrets Kubernetes (5 min)

#### Qu'est-ce qu'un Secret ?

Un Secret est un objet Kubernetes pour stocker des données sensibles :
- Mots de passe
- Tokens d'API
- Certificats SSL/TLS
- Clés SSH

#### Avantages des Secrets

- **Chiffré au repos** dans etcd (si configuré)
- **Monté en mémoire** dans les Pods (tmpfs)
- **Pas dans les logs** par défaut
- **Contrôlé par RBAC** (accès restreint)
- **Séparation code/config** (12-factor app)

#### Comparaison des approches

```
Mot de passe en dur
    ↓ Risque : visible dans Git, kubectl describe, logs

Mot de passe en Base64
    ↓ Risque : décodable facilement

Secret Kubernetes
    ↓ Chiffré dans etcd, monté en mémoire

Gestionnaire externe (Vault, AWS Secrets Manager)
    ↓ Rotation automatique, audit, accès contrôlé
```

---

### 3. Pratique guidée : Utiliser les Secrets (15 min)

#### Étape 1 : Créer un Secret

**Méthode 1 : Ligne de commande (recommandée)**

```bash
kubectl create secret generic db-credentials \
  --from-literal=username=todo \
  --from-literal=password='SuperSecret123!'

# Vérifie la création
kubectl get secrets
```

**Méthode 2 : Depuis un fichier**

```bash
# Crée un fichier temporaire
echo -n 'SuperSecret123!' > password.txt

# Crée le Secret
kubectl create secret generic db-creds-file \
  --from-file=password=password.txt

# IMPORTANT : Supprime le fichier immédiatement
rm password.txt
```

**Méthode 3 : Fichier YAML (déconseillé)**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: dG9kbw==  # "todo" en base64
  password: U3VwZXJTZWNyZXQxMjMh  # "SuperSecret123!" en base64
```

**Ne jamais commiter ce fichier dans Git !**

---

#### Étape 2 : Utiliser le Secret dans un Pod (variables d'environnement)

**Fichier : `pod-with-secret.yaml`**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: todo-backend-secure
spec:
  serviceAccountName: todo-backend-sa
  
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  
  containers:
  - name: backend
    image: todo-backend:v1
    
    # Injecter les Secrets comme variables d'environnement
    env:
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: username
    
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password
    
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
```

```bash
kubectl apply -f pod-with-secret.yaml

# Vérifie que le Secret est bien injecté
kubectl exec -it todo-backend-secure -- env | grep DB_
# DB_USERNAME=todo
# DB_PASSWORD=SuperSecret123!
```

---

#### Étape 3 : Monter le Secret comme volume (plus sécurisé)

Monter le Secret comme fichier est **plus sécurisé** que les variables d'environnement car :
- Les variables d'environnement peuvent fuiter dans les logs
- Les fichiers montés sont en lecture seule
- Possibilité de recharger sans redémarrer le Pod

**Fichier : `pod-with-secret-volume.yaml`**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: todo-backend-volume
spec:
  serviceAccountName: todo-backend-sa
  
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  
  containers:
  - name: backend
    image: todo-backend:v1
    
    # Monter le Secret comme volume
    volumeMounts:
    - name: db-secrets
      mountPath: "/etc/secrets"
      readOnly: true
    
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
  
  # Définir le volume Secret
  volumes:
  - name: db-secrets
    secret:
      secretName: db-credentials
```

```bash
kubectl apply -f pod-with-secret-volume.yaml

# Vérifie les fichiers montés
kubectl exec -it todo-backend-volume -- ls -la /etc/secrets
# drwxrwxrwt  3 root root  120 ... .
# drwxr-xr-x  1 root root 4096 ... ..
# lrwxrwxrwx  1 root root   15 ... password -> ..data/password
# lrwxrwxrwx  1 root root   15 ... username -> ..data/username

# Lire le contenu
kubectl exec -it todo-backend-volume -- cat /etc/secrets/username
# todo

kubectl exec -it todo-backend-volume -- cat /etc/secrets/password
# SuperSecret123!
```

---

#### Bonnes pratiques Secrets

**À FAIRE :**
- Utiliser `kubectl create secret` depuis la ligne de commande
- Ajouter `.secrets.yaml` dans `.gitignore`
- Activer encryption-at-rest pour etcd en production
- Limiter l'accès aux Secrets via RBAC
- Utiliser un gestionnaire externe (Vault) pour la production
- Rotation régulière des secrets

**À NE PAS FAIRE :**
- Commiter des Secrets dans Git
- Utiliser Base64 comme méthode de sécurité
- Partager des Secrets entre environnements (dev/prod)
- Logger les valeurs des Secrets
- Laisser les Secrets accessibles à tous

---

## Partie 4 – Pod Security Standards (25 min)

### 1. Le problème : Pods non sécurisés (5 min)

#### Exemple de Pod dangereux

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dangerous-pod
spec:
  hostNetwork: true      # Accès au réseau de l'hôte
  hostPID: true          # Voit tous les processus de l'hôte
  hostIPC: true          # Communication inter-processus hôte
  
  containers:
  - name: app
    image: nginx
    
    securityContext:
      privileged: true   # Tous les privilèges (root + capabilities)
      
    volumeMounts:
    - name: host-root
      mountPath: /host
  
  volumes:
  - name: host-root
    hostPath:
      path: /            # Monte tout le système de fichiers de l'hôte
```

**Conséquences :**
- Accès complet au système hôte
- Peut compromettre le nœud entier
- Peut accéder aux autres Pods
- Peut escalader vers le Control Plane

---

### 2. Pod Security Standards (PSS) (10 min)

#### Qu'est-ce que PSS ?

Les **Pod Security Standards** définissent 3 niveaux de sécurité pour les Pods.

#### Les 3 niveaux

| Niveau | Usage | Restrictions |
|--------|-------|--------------|
| **Privileged** | Aucune | Tout autorisé (très dangereux) |
| **Baseline** | Minimales | Bloque les pires pratiques |
| **Restricted** | Strictes | Best practices de sécurité (production) |

#### Comparaison détaillée

```
Privileged (default)
  ↓ Tout autorisé
  ↓ Dangereux en production
  ↓ Usage : développement local uniquement
  
Baseline
  ↓ Bloque :
  ↓   - privileged containers
  ↓   - hostNetwork, hostPID, hostIPC
  ↓   - hostPath volumes
  ↓ Autorise :
  ↓   - root user
  ↓   - capabilities par défaut
  ↓ Usage : applications legacy, migration progressive
  
Restricted
  ↓ Bloque : tout ce que Baseline bloque +
  ↓   - root user (runAsNonRoot: true requis)
  ↓   - volume types dangereux
  ↓   - toutes les capabilities (sauf NET_BIND_SERVICE)
  ↓   - allowPrivilegeEscalation: true
  ↓ Usage : production, applications modernes
```

#### Restrictions du niveau Restricted

Le niveau **Restricted** impose :

- `runAsNonRoot: true` (obligatoire)
- `allowPrivilegeEscalation: false` (obligatoire)
- `capabilities.drop: ["ALL"]` (obligatoire)
- `seccompProfile.type: RuntimeDefault` (obligatoire)
- Pas de `hostNetwork`, `hostPID`, `hostIPC`
- Pas de volumes `hostPath`
- Pas de conteneurs `privileged`

---

### 3. Pratique guidée : Activer PSS (10 min)

#### Étape 1 : Créer un namespace sécurisé

```bash
# Crée le namespace
kubectl create namespace secure-apps

# Applique le niveau Restricted
kubectl label namespace secure-apps \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted

# Vérifie les labels
kubectl get namespace secure-apps --show-labels
```

**Explication des modes :**
- `enforce` : **Bloque** les Pods non conformes
- `audit` : **Log** les violations sans bloquer
- `warn` : **Avertit** l'utilisateur sans bloquer

---

#### Étape 2 : Tester avec un Pod non conforme

```bash
# Tente de créer un Pod root
kubectl run root-pod --image=nginx -n secure-apps

# Erreur attendue :
# Error from server (Forbidden): pods "root-pod" is forbidden:
# violates PodSecurity "restricted:latest":
# allowPrivilegeEscalation != false, unrestricted capabilities,
# runAsNonRoot != true, seccompProfile
```

---

#### Étape 3 : Déployer un Pod conforme

**Fichier : `compliant-pod.yaml`**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: compliant-pod
  namespace: secure-apps
spec:
  # SecurityContext Pod level
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault  # Profil seccomp obligatoire
  
  containers:
  - name: app
    image: nginx:alpine
    
    # SecurityContext Container level
    securityContext:
      allowPrivilegeEscalation: false  # Obligatoire
      capabilities:
        drop:
        - ALL  # Obligatoire
    
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run
  
  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

```bash
kubectl apply -f compliant-pod.yaml
# pod/compliant-pod created

# Vérifie le statut
kubectl get pod compliant-pod -n secure-apps
```

---

#### Étape 4 : Déployer Todo App en mode Restricted

**Fichier : `todo-app-secure.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-backend
  namespace: secure-apps
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
      serviceAccountName: todo-backend-sa
      
      # Conforme au niveau Restricted
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      
      containers:
      - name: backend
        image: todo-backend:v1
        
        ports:
        - containerPort: 5000
        
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      
      volumes:
      - name: tmp
        emptyDir: {}
```

```bash
# Copie le ServiceAccount et Secret dans le namespace sécurisé
kubectl get sa todo-backend-sa -o yaml | \
  sed 's/namespace: default/namespace: secure-apps/' | \
  kubectl apply -f -

kubectl get secret db-credentials -o yaml | \
  sed 's/namespace: default/namespace: secure-apps/' | \
  kubectl apply -f -

# Déploie l'application
kubectl apply -f todo-app-secure.yaml

# Vérifie
kubectl get pods -n secure-apps
```

---

## Récapitulatif et bonnes pratiques

### Checklist de sécurité Kubernetes

#### RBAC
- ServiceAccounts dédiés pour chaque application
- Principe du moindre privilège (permissions minimales)
- Pas d'utilisation du ServiceAccount `default`
- RoleBindings plutôt que ClusterRoleBindings quand possible
- Audit régulier des permissions

#### SecurityContext
- `runAsNonRoot: true` sur tous les Pods
- `allowPrivilegeEscalation: false` systématique
- `capabilities.drop: ["ALL"]` par défaut
- `readOnlyRootFilesystem: true` quand possible
- Utilisation de `seccompProfile: RuntimeDefault`

#### Secrets
- Jamais de secrets en clair dans les YAML
- Utilisation de `kubectl create secret` ou gestionnaire externe
- Secrets montés comme volumes plutôt que variables d'environnement
- RBAC strict sur l'accès aux Secrets
- Rotation régulière des secrets

#### Pod Security Standards
- Niveau **Restricted** activé sur les namespaces de production
- Niveau **Baseline** minimum pour les autres environnements
- Mode `enforce` activé (pas seulement `warn`)
- Tests de conformité avant déploiement

---

### Outils de sécurité recommandés

**Analyse statique :**
- **kubesec** : Scan de sécurité des manifestes YAML
- **kube-bench** : Vérifie conformité CIS Benchmark
- **Polaris** : Audit de configuration

**Runtime :**
- **Falco** : Détection d'anomalies runtime
- **OPA/Gatekeeper** : Policy as Code
- **Trivy** : Scan de vulnérabilités images
