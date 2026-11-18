# LeannaAuto

Agents autonomes (« automatons ») avec missions persistantes, exécution en sandbox Linux, constitution, supervision des ressources, propositions d'auto-amélioration et réplication limitée. Ni wallets, ni argent, ni blockchain.

## Prérequis
- Node.js 20+
- Docker installé et accessible (l'outil shell s'exécute dans un conteneur)
- Une clé API et un identifiant de modèle OpenRouter

## Démarrage rapide
```bash
cp .env.example .env
# Renseigner OPENROUTER_API_KEY et OPENROUTER_MODEL
npm install
npm run dev -- init --name Researcher --goal "Build a useful open-source tool"
npm run dev -- start researcher-XXXXXXXX # remplacer par l'identifiant généré
npm run dev -- status researcher-XXXXXXXX
npm run dev -- logs researcher-XXXXXXXX --follow
```

`init` écrit la mission de genèse. `start` exécute une boucle en avant-plan. Arrêt par Ctrl+C ou la commande `stop`.
L'exécuteur Docker crée des conteneurs isolés avec des limites de CPU, de mémoire et de PID, et désactive le réseau par défaut. La constitution applique un simple filtrage des commandes ; ce n'est pas une garantie de sécurité. Le MVP n'est pas prêt pour la production.

## CLI
- `init --name NOM --goal OBJECTIF` (option `--parent ID` pour créer un agent enfant)
- `start ID`
- `stop ID`
- `status ID`
- `resources ID`
- `usage [ID]` (totaux de tokens et quota global)
- `logs ID --tail N --follow`
- `identity ID`
- `spawn ID --goal GOAL` (crée le manifeste d'un enfant ; l'enfant doit être démarré séparément)

### Tâches persistantes
Les tâches peuvent être stockées et suivies séparément de la boucle de l'agent :
```bash
npm run dev -- task add AGENT_ID --title "Investigate issue" --description "Write findings to workspace"
npm run dev -- task list AGENT_ID
npm run dev -- task set TASK_ID active
npm run dev -- task set TASK_ID completed
```
Leurs états sont stockés en SQLite (`pending`, `active`, `completed`, `failed`). Ce suivi CLI n'est pas encore consommé automatiquement par le planificateur de l'agent.

### Superviseur
```bash
npm run dev -- supervise --interval 10 --stale 90
```
Le watchdog démarre les boucles des agents marqués `running` en base, enregistre les horodatages de heartbeat et détecte les heartbeats obsolètes. Les boucles en avant-plan utilisent des leases SQLite pour éviter les démarrages en double et récupérer les boucles obsolètes. Pour une récupération au niveau processus en production, exécutez-le sous systemd, une politique de redémarrage Docker ou un autre gestionnaire de processus externe ; ce MVP ne force pas encore l'arrêt ni le remplacement d'une boucle bloquée.

## Dashboard (interface web)

Le dashboard se lance avec :
```bash
npm run ui
```
Il est accessible par défaut sur `http://127.0.0.1:3000`. Vue d'ensemble, Bureau IA, Univers 3D, Supervision, Agents, Missions, Tâches, Filiation & dépendances, Logs système, Audit, Quota IA, Ressources, Workspace et Sécurité & paramètres y sont disponibles.

### Authentification et sécurité

Le dashboard écoute uniquement sur `127.0.0.1`. Avant le premier démarrage, définissez dans `.env` un `LEANNAAUTO_UI_TOKEN` unique et aléatoire ; c'est le credential administrateur d'amorçage. Le `LEANNAAUTO_UI_OPERATOR_TOKEN` optionnel amorce un credential opérateur restreint. Le dashboard accepte l'un ou l'autre rôle et applique une autorisation explicite par route.

L'administrateur peut gérer les credentials dans **Sécurité & paramètres** :
- Générer un nouveau token administrateur ou opérateur.
- Révoquer le token opérateur.
- Un token généré n'est affiché qu'une seule fois. Copiez-le avant de fermer le panneau.
- Les tokens générés par le dashboard sont stockés en SQLite uniquement sous forme de hachés scrypt salés ; les tokens bruts ne sont jamais stockés ni écrits dans les logs d'audit.
- Un credential stocké prime sur le token d'environnement correspondant. La rotation invalide donc immédiatement le token précédent.
- Les tentatives de connexion invalides sont limitées en fréquence (8 échecs par minute et par adresse source).
- Le navigateur conserve le token porteur actif dans `sessionStorage`, pour l'onglet courant uniquement.

L'administrateur peut également modifier le quota global de tokens d'inférence dans la page de paramètres. La valeur est persistée en SQLite et utilisée par le runtime d'inférence, le dashboard et le CLI. `INFERENCE_QUOTA` reste la valeur initiale/par défaut tant qu'aucun administrateur n'a enregistré un remplacement.

En cas de perte du token administrateur, exécutez la commande locale de récupération depuis le répertoire du dépôt :
```bash
npm run dev -- security reset-admin-token
```
Le nouveau token est affiché une seule fois dans le terminal. Il remplace tout credential administrateur stocké. Pour révoquer un token opérateur depuis le shell local :
```bash
npm run dev -- security revoke-operator-token
```

L'API n'accepte que des valeurs Host/Origin en boucle locale, plafonne les corps JSON à 1 Mio, applique des délais d'expiration de requête et d'en-tête, et envoie des en-têtes de sécurité restrictifs pour le navigateur. N'exposez pas publiquement le port du dashboard et ne réutilisez pas ses tokens ailleurs. Ne commettez pas le secret d'amorçage dans le dépôt.

Générez un token d'amorçage avec Node.js :
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### Arrêt d'urgence global
L'administrateur du dashboard peut activer un arrêt d'urgence global persistant. Il marque tous les agents en cours d'exécution comme arrêtés, demande l'arrêt de leurs sandbox Docker et empêche le démarrage de nouvelles boucles d'agents, via le dashboard comme via le CLI, tant que le verrou est actif. La réinitialisation du verrou n'autorise que les démarrages futurs ; elle ne redémarre pas automatiquement les agents. L'état d'arrêt d'urgence est stocké en SQLite et survit aux redémarrages du dashboard.

## Configuration

Variables d'environnement (voir `.env.example`) :

| Variable | Rôle | Défaut |
|---|---|---|
| `OPENROUTER_API_KEY` | Clé API OpenRouter | — |
| `OPENROUTER_MODEL` | Identifiant du modèle | — |
| `OPENROUTER_BASE_URL` | Point de terminaison de l'API | `https://openrouter.ai/api/v1` |
| `OPENROUTER_SITE_URL` / `OPENROUTER_APP_NAME` | En-têtes d'attribution optionnels | — / `LeannaAuto` |
| `LLM_TIMEOUT_MS` | Délai maximum de chaque requête d'inférence | `120000` |
| `AUTOMATON_DB` | Chemin de la base SQLite | `./data/automaton.db` |
| `DOCKER_IMAGE` | Image utilisée pour les sandbox | `node:22-bookworm-slim` |
| `INFERENCE_QUOTA` | Plafond global de tokens d'inférence | `100000` |
| `INFERENCE_QUOTA_USED` | Compteur initial de tokens consommés | `0` |
| `MAX_CHILDREN_PER_AGENT` | Enfants maximum par agent | `3` |
| `MAX_AGENTS_TOTAL` | Nombre total maximum d'agents | `20` |
| `LEANNAAUTO_UI_TOKEN` | Token administrateur d'amorçage du dashboard | — |
| `LEANNAAUTO_UI_OPERATOR_TOKEN` | Token opérateur optionnel | — |

## OpenRouter

Configurez `OPENROUTER_API_KEY` et `OPENROUTER_MODEL` dans `.env`. Le point de terminaison par défaut est `https://openrouter.ai/api/v1`. Les en-têtes d'attribution optionnels sont configurés avec `OPENROUTER_SITE_URL` et `OPENROUTER_APP_NAME`. `LLM_TIMEOUT_MS` borne chaque requête HTTP d'inférence (par défaut : 120000 ms).

## Budget d'inférence

`INFERENCE_QUOTA` est un plafond global de tokens. Le `usage.total_tokens` rapporté par OpenRouter est persisté en SQLite par agent. Les appels sont bloqués lorsque le total enregistré atteint le plafond. Utilisez `npm run dev -- usage` pour les totaux globaux, ou ajoutez un identifiant d'agent pour l'usage par agent. Les modèles/fournisseurs qui omettent les champs d'usage peuvent être sous-comptabilisés.

## Limitations
- Les boucles des agents tournent en avant-plan. `supervise` est un watchdog en avant-plan qui s'appuie sur des leases SQLite et des heartbeats pour éviter les démarrages en double et récupérer les boucles obsolètes. Il ne remplace pas un gestionnaire de processus externe ni la récupération du démon Docker.
- L'appel d'outils utilise un simple protocole texte, pas des appels d'outils natifs structurés.
- L'identité expose actuellement une empreinte ; la signature par clé privée et la garde des clés ne sont pas implémentées.
- La réplication crée uniquement un enregistrement d'enfant ; la budgétisation des ressources et le spawn automatique ne sont pas implémentés.
- L'auto-modification n'est pas encore implémentée.
- L'accès au réseau est désactivé dans la sandbox ; pas d'outils web/API pour l'instant.
- Les vérifications de la constitution sont des heuristiques basiques. C'est un prototype : ne l'exécutez pas sur une machine contenant des données sensibles.
- L'accès au socket Docker, s'il est utilisé pour l'orchestration de l'hôte, équivaut à une permission hôte très puissante. Gardez l'hôte dédié et n'exposez jamais le socket au conteneur de l'agent.
