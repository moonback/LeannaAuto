# Audit UX/UI et périmètre de la refonte LeannaAuto

Date de l'audit : 2026-11-18  
Branche de travail : `ui/premium-operations-center`  
Périmètre : shell web, navigation, rendu client, API HTTP de la console, autorisations, stockage SQLite, runtime, supervision et workspace.

## Architecture à préserver

- Application Node.js / TypeScript, modules ESM, compilation avec `tsc`, tests Vitest.
- Interface servie par le serveur HTTP existant. Le HTML est composé dans `src/ui/template.ts` à partir de trois fragments dédiés : `src/ui/navigation.ts`, `src/ui/styles.ts` et `src/ui/client.ts`. Aucun framework SPA n'est requis.
- Persistance SQLite dans `src/storage.ts` : `agents`, `logs`, `usage`, `tasks`, `audit`, `events`, `system_state`, `ui_credentials`.
- Runtime et exécution : `src/agent.ts`, `src/agent-runtime.ts`, `src/executor.ts`, `src/supervisor.ts`, `src/resources.ts`.
- Contrôle d'accès : `src/ui-security.ts`, rôles `admin` et `operator`, restrictions Host/Origin loopback, limitation de taille JSON, vérification de jetons en temps constant et stockage persistant sous forme de hash salé dérivé.
- Workspace : `src/workspace.ts`, accès Docker en lecture seule, normalisation des chemins, refus des traversées, liens symboliques non suivis, aperçu limité à 256 Kio.

## Pages présentes dans le shell

| Section | Identifiant | Source fonctionnelle |
|---|---|---|
| Vue d'ensemble | `overview` | synthèse dashboard, santé, alertes, agents et activité |
| Bureau IA | `office` | hiérarchie agents et tâches |
| Univers 3D | `universe` | scène Canvas 2D interactive |
| Supervision | `supervisor` | états, heartbeats, redémarrages, erreurs |
| Agents | `agents` | création, édition, démarrage, arrêt, suppression contrôlée |
| Missions | `missions` | objectifs associés aux agents, tâches et annulation |
| Tâches | `tasks` | création, édition, attribution, annulation et suppression |
| Filiation | `lineage` | liens parent/enfant et affectations agent/tâche |
| Logs | `logs` | événements persistés, filtres API et recherche locale |
| Audit | `audit` | 100 dernières lignes du journal d'audit |
| Quota IA | `usage` | consommation cumulée et quota global |
| Ressources | `resources` | mesures instantanées hôte, processus et Docker |
| Workspace | `workspace` | navigation et aperçu en lecture seule |
| Sécurité | `settings` | jetons, rôles et quota |
| Fiche agent | `detail` | inspection détaillée d'un agent |

Les 14 cibles de navigation correspondent à une section existante. La fiche agent est une section complémentaire ouverte depuis les vues agents et commandes.

## API de la console

Routes explicites observées dans `src/ui.ts` :

- `POST /api/auth`
- `GET /api/dashboard`
- `GET /api/events` avec filtres agent, tâche, type, niveau, plage temporelle et curseur `before`
- `GET /api/resources`
- `GET /api/security`
- `POST /api/security/tokens`
- `POST /api/security/settings`
- `POST /api/emergency-stop` et `POST /api/emergency-stop/reset`
- `POST /api/agents`, plus routes agent paramétrées pour lecture, modification, démarrage, arrêt, mission, annulation et suppression
- `POST /api/tasks`, plus routes tâche paramétrées pour modification, attribution, annulation et suppression

La politique effective est centralisée dans `isAllowedUiRequest` de `src/ui-security.ts`. Les opérateurs disposent des lectures opérationnelles et des écritures de tâches/création et cycle de vie autorisés ; les changements administratifs, jetons, paramètres, quotas, missions, suppressions et arrêt d'urgence restent réservés à l'administrateur. Toute route non explicitement autorisée est refusée.

## Règles métier et données à ne pas simuler

- Les missions sont des objectifs portés par les agents ; elles ne constituent pas une table autonome dans le schéma actuel.
- Les relations de filiation sont les `parent_id` réellement enregistrés. Les affectations agent/tâche proviennent de `tasks.agent_id`. Aucune dépendance tâche→tâche n'est persistée.
- Les tâches actives ne sont pas éditables ou supprimables. L'annulation d'une tâche active peut arrêter l'agent responsable ; la réaffectation est limitée aux tâches en attente.
- Les compteurs de quota proviennent des enregistrements `usage`. Le schéma ne fournit pas de séries temporelles agrégées pour tracer une courbe historique.
- Les ressources exposées sont des mesures instantanées. Une mesure absente doit rester « indisponible », et non être convertie en zéro.
- Le journal d'audit stocke `at`, `action`, `target` et `details`. Il ne persiste pas de colonnes acteur/résultat ; l'interface ne doit pas inventer ces champs.
- Le workspace est strictement en lecture seule : pas de terminal, d'écriture, de suivi de lien symbolique ni d'aperçu au-delà de 256 Kio.
- L'Univers utilise Canvas 2D ; ne pas annoncer WebGL.

## Problèmes UX/UI observés avant les dernières tranches

1. Le shell global et les pages partagent un header peu contextuel : pas de breadcrumb ni de description de page.
2. Les groupes de navigation étaient statiques ; le mode compact et le mode mobile nécessitaient une meilleure hiérarchie.
3. Le journal d'événements était rendu en bloc de texte, malgré des données structurées et une API paginée/filtrable.
4. Le journal d'audit était un bloc de texte sans recherche, filtres, pagination visuelle ni export.
5. La page quota montrait des totaux mais pas de lecture visuelle de la part consommée.
6. Les confirmations natives et alertes navigateur créaient des interactions incohérentes ; le premier socle a introduit une confirmation accessible et une région de notifications.
7. Les composants de page restent largement construits dans un template HTML sérialisé ; la modularisation doit rester progressive pour ne pas introduire une migration de framework risquée.

## Modifications déjà présentes sur la branche

- Tokens CSS communs, échelle d'espacement de 4 à 64 px, thèmes sémantiques, états focus, responsive et réduction des animations.
- Confirmation commune avec rôle `alertdialog`, Échap, fermeture par fond, piège de focus et retour au déclencheur.
- Région de notifications et retours de succès/erreur sur les opérations de sécurité et quota.
- Header contextuel avec breadcrumb, description et métadonnées par section.
- Groupes de navigation repliables, état mémorisé dans `localStorage`, sans réduire la navigation mobile.
- Explorateur d'audit : recherche, filtre d'action, pagination locale (20 lignes), détails repliables et export CSV des 100 lignes exposées par le dashboard. Les champs acteur/résultat non stockés ne sont pas présentés comme disponibles.
- Explorateur d'événements : timeline structurée, filtres agent/type/niveau, détails repliables et copie d'un événement.
- Visualisation de progression du quota calculée uniquement depuis le total et le plafond persistés.
- Assertions de composition étendues : syntaxe du client, cibles de navigation, identifiants uniques, éléments des nouvelles pages.

## Limites et travaux restants

- Cet audit documente le périmètre et les invariants ; il ne constitue pas encore une revue exhaustive ligne par ligne de chaque fonction UI et de chaque test métier.
- Les vues missions, supervision, filiation, workspace et ressources nécessitent encore une passe de cohérence visuelle et d'interactions. La vue agents et la vue tâches restent à tester dans un navigateur sur des données représentatives.
- Les filtres/tri avancés agents et les inspections plus complètes restent à évaluer à partir des fonctions déjà disponibles. La vue Kanban tâches est maintenant implémentée à partir des mêmes tâches réelles et conserve les règles d'actions du tableau.
- Les captures desktop/mobile avant/après ne sont pas encore produites.
- La validation statique de composition effectuée dans cette session confirme : client JavaScript analysable, shell recomposé, 15 sections, 14 cibles de navigation résolues, aucun ID HTML dupliqué et absence d'appels natifs `confirm()` / `alert()`.
- Le build TypeScript et Vitest ne sont pas déclarés réussis. Le dernier workflow observé (`44399440923`) échoue au job `Node.js toolchain` sans étapes rapportées (`steps=null`) ; l'API de logs répond 404. `npm ci`, build et tests sont donc ignorés et non exécutés.
- La branche a été synchronisée avec `main` par un commit de merge non destructif ; elle est actuellement en avance de 38 commits et en retard de 0.
