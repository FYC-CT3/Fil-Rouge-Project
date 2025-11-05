## Exercice final : Sécuriser complètement la Todo App

### Mission

Sécurise l'ensemble de la Todo App (frontend + backend + database) en appliquant TOUTES les bonnes pratiques apprises :

**Requirements :**

1. **RBAC :**
   - ServiceAccounts dédiés pour chaque composant
   - Roles avec permissions minimales
   - RoleBindings appropriés

2. **SecurityContext :**
   - Tous les Pods en non-root
   - `allowPrivilegeEscalation: false`
   - Capabilities supprimées
   - Filesystem en lecture seule (avec volumes temporaires)

3. **Secrets :**
   - Mot de passe PostgreSQL dans un Secret
   - Variables sensibles du backend dans des Secrets
   - Montage via volumes

4. **Pod Security Standards :**
   - Namespace avec niveau Restricted
   - Tous les Pods conformes

**Livrables :**
- Fichiers YAML pour tous les composants
- Script de déploiement complet
- Documentation des choix de sécurité