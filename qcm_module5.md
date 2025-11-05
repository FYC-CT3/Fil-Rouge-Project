# QCM - Module 5 : Sécurité Kubernetes

**Durée : 15 minutes**
**Notation : /20 points**

**Instructions :**
- 8 questions à choix multiples
- Certaines questions peuvent avoir plusieurs bonnes réponses
- Lis attentivement chaque question avant de répondre
- Pas de points négatifs

---

## Question 1 (2 points)

Quel est le rôle principal de RBAC (Role-Based Access Control) dans Kubernetes ?

- [ ] a) Gérer les ressources CPU et RAM des Pods
- [ ] b) Contrôler qui peut faire quoi sur quelles ressources
- [ ] c) Chiffrer les communications entre les Pods
- [ ] d) Optimiser les performances du cluster

**Barème :** 2 points pour la bonne réponse

---

## Question 2 (3 points)

Parmi les objets RBAC suivants, lesquels ont une portée limitée à un namespace spécifique ? (Plusieurs réponses possibles)

- [ ] a) Role
- [ ] b) ClusterRole
- [ ] c) RoleBinding
- [ ] d) ClusterRoleBinding

**Barème :** 1.5 point par bonne réponse (3 points maximum)

---

## Question 3 (2 points)

Pourquoi est-il dangereux d'exécuter des conteneurs en tant qu'utilisateur root ?

- [ ] a) Cela consomme plus de ressources CPU
- [ ] b) Si le conteneur est compromis, l'attaquant obtient des privilèges élevés
- [ ] c) Les conteneurs root ne peuvent pas communiquer avec l'API Kubernetes
- [ ] d) Cela ralentit le démarrage du Pod

**Barème :** 2 points pour la bonne réponse

---

## Question 4 (3 points)

Quels paramètres SecurityContext sont recommandés pour sécuriser un Pod en production ? (Plusieurs réponses possibles)

- [ ] a) `runAsNonRoot: true`
- [ ] b) `allowPrivilegeEscalation: false`
- [ ] c) `privileged: true`
- [ ] d) `capabilities.drop: ["ALL"]`
- [ ] e) `hostNetwork: true`

**Barème :** 1 point par bonne réponse (3 points maximum)

---

## Question 5 (3 points)

Concernant les Secrets Kubernetes, quelles affirmations sont vraies ? (Plusieurs réponses possibles)

- [ ] a) Base64 est un chiffrement suffisant pour protéger les secrets
- [ ] b) Les Secrets peuvent être montés comme volumes dans les Pods
- [ ] c) Les Secrets sont chiffrés au repos dans etcd (si configuré)
- [ ] d) Il est recommandé de commiter les fichiers de Secrets dans Git
- [ ] e) Monter un Secret comme volume est plus sécurisé que l'utiliser en variable d'environnement

**Barème :** 1 point par bonne réponse (3 points maximum)

---

## Question 6 (2 points)

Quelle est la différence entre l'encodage Base64 et le chiffrement ?

- [ ] a) Base64 est plus sécurisé que le chiffrement
- [ ] b) Base64 est facilement réversible sans clé, le chiffrement nécessite une clé
- [ ] c) Base64 et chiffrement sont identiques
- [ ] d) Base64 ne peut pas être décodé

**Barème :** 2 points pour la bonne réponse

---

## Question 7 (3 points)

Quels sont les trois niveaux de Pod Security Standards (PSS) dans Kubernetes ?

- [ ] a) Low, Medium, High
- [ ] b) Privileged, Baseline, Restricted
- [ ] c) Basic, Standard, Advanced
- [ ] d) Open, Protected, Secured

Et quel niveau est recommandé pour la production ?

- [ ] e) Privileged
- [ ] f) Baseline
- [ ] g) Restricted

**Barème :** 1.5 point pour la première partie + 1.5 point pour la deuxième partie

---

## Question 8 (2 points)

Que bloque le niveau "Restricted" des Pod Security Standards ?

- [ ] a) L'exécution de conteneurs en tant que root
- [ ] b) L'utilisation de Services de type LoadBalancer
- [ ] c) L'escalade de privilèges (allowPrivilegeEscalation)
- [ ] d) La création de PersistentVolumeClaims

**Barème :** 1 point par bonne réponse (2 points maximum)

---

## Grille de correction

### Question 1 (2 points)
**Réponse correcte : b**
- b) Contrôler qui peut faire quoi sur quelles ressources (2 points)

### Question 2 (3 points)
**Réponses correctes : a, c**
- a) Role (1.5 point)
- c) RoleBinding (1.5 point)

### Question 3 (2 points)
**Réponse correcte : b**
- b) Si le conteneur est compromis, l'attaquant obtient des privilèges élevés (2 points)

### Question 4 (3 points)
**Réponses correctes : a, b, d**
- a) `runAsNonRoot: true` (1 point)
- b) `allowPrivilegeEscalation: false` (1 point)
- d) `capabilities.drop: ["ALL"]` (1 point)

### Question 5 (3 points)
**Réponses correctes : b, c, e**
- b) Les Secrets peuvent être montés comme volumes dans les Pods (1 point)
- c) Les Secrets sont chiffrés au repos dans etcd (si configuré) (1 point)
- e) Monter un Secret comme volume est plus sécurisé que l'utiliser en variable d'environnement (1 point)

### Question 6 (2 points)
**Réponse correcte : b**
- b) Base64 est facilement réversible sans clé, le chiffrement nécessite une clé (2 points)

### Question 7 (3 points)
**Réponses correctes : b, g**
- b) Privileged, Baseline, Restricted (1.5 point)
- g) Restricted (1.5 point)

### Question 8 (2 points)
**Réponses correctes : a, c**
- a) L'exécution de conteneurs en tant que root (1 point)
- c) L'escalade de privilèges (allowPrivilegeEscalation) (1 point)
