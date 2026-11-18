# LeannaAuto — Roadmap produit et technique

> Document de pilotage. La roadmap est évolutive : chaque étape doit être livrée sur une branche Git dédiée, testée, puis intégrée après validation. La sécurité et la stabilité priment sur l'ajout de fonctionnalités.

## 1. Vision et règles non négociables

LeannaAuto est une plateforme locale d'agents autonomes, capables d'exécuter des tâches dans des environnements isolés, de coopérer et d'évoluer sous contrôle.

Principes :
- Aucun objectif financier : pas de wallets, crypto, paiements, revenus ou mécanismes de rentabilité.
- Budget de ressources explicite : CPU, RAM, stockage, nombre de processus, durée d'exécution et tokens.
- Constitution de sécurité prioritaire sur les instructions, objectifs et modifications proposés par les agents.
- Isolation par défaut : sandbox, réseau désactivé par défaut, privilèges minimaux.
- Identité locale distincte pour chaque agent, avec authentification cryptographique à terme.
- Toute action sensible doit être autorisée, traçable et réversible lorsque c'est possible.
- Aucune auto-modification, réplication ou élévation de privilèges autonome sans garde-fous explicites.
- Fonctionnement local et contrôle humain conservés comme modes de référence.

## 2. État de départ

État établi au 18 novembre 2026, à partir des fonctionnalités présentes dans le dépôt et des validations rapportées.

| Domaine | État | Détail |
|---|---|---|
| Runtime TypeScript / CLI | En place | Base Node.js, TypeScript et commandes CLI. |
| Persistance | En place | SQLite pour agents, tâches, logs, usage et état système. |
| LLM | En place | OpenRouter et configuration par variables d'environnement. |
| Sandbox | En place, à durcir | Docker, limites de ressources et réseau désactivé dans le profil actuel. |
| Constitution | Partielle | Garde-fous heuristiques et tests de commandes interdites ; ce n'est pas une garantie formelle. |
| Tâches et heartbeat | En place | Tâches persistantes et état des agents. |
| Supervision | Partielle | Watchdog de surveillance ; pas encore un véritable gestionnaire de processus résilient. |
| Quotas IA | En place, à fiabiliser | Comptabilisation des tokens et quota global. |
| Audit | En place, à durcir | Historique persistant et événements d'actions. La rédaction des secrets et données sensibles reste à vérifier. |
| Authentification UI | En place, à auditer | Jetons admin et opérateur, autorisations appliquées côté serveur. |
| Arrêt d'urgence | En place | Verrouillage global persistant et blocage des démarrages. |
| Dashboard | En place, centre de contrôle à construire | Pages et API locales existantes ; première vue Missions ajoutée. Les vues de pilotage approfondi, événements structurés, métriques fiables et interventions guidées restent à livrer. |
| Identité | Partielle | Empreinte d'identité ; pas encore de clés Ed25519 et de signatures vérifiables. |
| Auto-évolution | Non livrée | Pas de système sûr de proposition, revue, test et déploiement de modifications. |
| Réplication contrôlée | Non livrée | La création d'un agent enfant ne constitue pas encore une réplication opérationnelle complète. |

Validation utilisateur Windows du 18 novembre 2026 sur `feat/mission-control-ui` : `npm ci` réussi ; `npm run build` réussi ; `npm test` réussi avec 13 fichiers et 49 tests (tous les tests Docker opt-in activés) ; `npm run ui` démarre sur `http://127.0.0.1:3000`. Cette validation confirme la compilation, les tests et le démarrage serveur ; la validation visuelle et fonctionnelle de la nouvelle vue Missions reste à faire.

## 2.1. Consolidation et nouveau chantier interface

Branche d'intégration : `integration/agent-observability`, créée depuis `fix/docker-exec-orphan-lock`. Les lots précédents sont déjà empilés en chaîne de commits ; cette branche reprend leur état complet sans cherry-pick ni fusion artificielle de branches déjà ancêtres les unes des autres. Aucune modification de `main`.

Branche UI : `feat/mission-control-ui`, créée depuis la branche d'intégration. Première livraison : vue Missions qui regroupe les agents par état et expose mission, tâche active ou prochaine tâche, dernière activité, heartbeat et actions de contrôle. Les informations proviennent des données déjà présentes dans `/api/dashboard` ; aucune progression chiffrée n'est inventée.

## 3. Roadmap par phases

### Phase 0 — Stabilisation et qualité de livraison
**Priorité : P0 · Prérequis de toutes les phases**

Objectif : disposer d'une base reproductible, observable et facile à mettre à jour.

Travaux :
- [ ] Valider `feat/pro-dashboard-ui` sous Windows : build, tests, lancement UI et navigation.
- [ ] Corriger les erreurs TypeScript, bundling ou JavaScript avant toute nouvelle fonctionnalité.
- [ ] Ajouter des tests pour les routes API, les rôles admin/opérateur et l'arrêt d'urgence.
- [ ] Vérifier que les erreurs d'API sont cohérentes et ne divulguent ni secrets ni stack traces.
- [ ] Stabiliser les migrations SQLite et leur comportement sur une base existante.
- [ ] Faire passer la CI sur build et tests ; rendre les échecs bloquants.
- [ ] Ajouter une procédure documentée de sauvegarde et restauration SQLite.
- [ ] Documenter précisément les variables d'environnement, le démarrage et le diagnostic Windows.

Critères de sortie :
- Build et tests verts localement et dans la CI.
- Mise à jour depuis une installation existante sans perte de données.
- Les scénarios critiques sont couverts par des tests automatisés.

### Phase 1 — Centre de contrôle opérationnel
**Priorité : P0 · Chantier produit principal**

Objectif : faire de l'interface le poste de pilotage quotidien. L'utilisateur doit comprendre en quelques secondes ce que fait chaque agent, pourquoi il le fait, sur quelle tâche il travaille, ce qui vient de se passer et quelle intervention est nécessaire.

#### 1A — Vue d'ensemble / salle de contrôle
- [x] Construire la première page d'accueil opérationnelle : agents enregistrés/actifs, tâches actives, alertes, état des heartbeats et interventions requises.
- [ ] Compléter les compteurs dédiés aux agents en attente/arrêtés, tâches en retard et approbations en attente.
- [ ] Afficher l'état vérifié du runtime, du superviseur, de SQLite, de Docker et du fournisseur LLM sans confondre état inconnu et état sain.
- [x] Ajouter un flux d'activité récent alimenté par les logs persistés, trié du plus récent au plus ancien.
- [ ] Ajouter des filtres globaux par agent, statut, mission, période et niveau de gravité.
- [x] Rendre visibles l'heure de dernière actualisation et les heartbeats absents ou périmés ; seuil de retard aligné sur le bail runtime (90 secondes).
- [x] Ajouter des accès directs vers les missions et le journal complet depuis la salle de contrôle.

#### 1B — Tableau des missions
- [x] Première vue Missions : cartes d'agents, objectif, tâche active/prochaine tâche, dernière activité, heartbeat, état et actions démarrer/arrêter.
- [ ] Faire valider la première vue Missions visuellement sous Windows et corriger les problèmes de navigation, responsive et lisibilité.
- [ ] Transformer la grille en tableau/kanban filtrable : En attente, En cours, Bloqué, Terminé, Échec, Arrêté.
- [ ] Distinguer explicitement mission de l'agent, tâche courante, prochaine tâche et dernier résultat ; ne jamais présenter une tâche pending comme une tâche en cours.
- [ ] Afficher depuis combien de temps l'agent travaille sur la tâche, le dernier progrès observé et la raison d'un éventuel blocage, uniquement si ces données sont enregistrées.
- [ ] Ajouter recherche, tri, filtres persistants et sélection multiple pour les opérations sûres.
- [ ] Ajouter un indicateur de santé avec états explicites : sain, heartbeat en retard, erreur, sandbox indisponible, état inconnu.

#### 1C — Fiche agent complète
- [ ] Créer une fiche avec identité, identifiant, mission, statut runtime, date de création, parent/enfants, version, empreinte de constitution et capacités autorisées.
- [ ] Ajouter un panneau « maintenant » : tâche active, étape courante, dernier message du modèle, dernier outil exécuté, résultat et durée.
- [ ] Afficher une chronologie unifiée des événements de l'agent avec filtres et recherche.
- [ ] Afficher tâches passées, présentes et planifiées, avec statut, dates, durée, tentatives et résultat.
- [ ] Afficher heartbeat, propriétaire du bail, redémarrages, erreurs récentes et état de la sandbox.
- [ ] Afficher consommation réelle et historique : CPU, mémoire, stockage, PIDs et tokens, avec indication des métriques indisponibles.
- [ ] Ajouter des onglets lisibles : Vue d'ensemble, Mission, Activité, Tâches, Ressources, Workspace, Configuration et Audit.
- [ ] Garder le workspace en lecture seule ; afficher les chemins et métadonnées sans exposer les secrets.

#### 1D — Gestion complète des tâches
- [ ] Ajouter une page Tâches avec vues liste et kanban, recherche, filtres, tri et pagination.
- [ ] Ajouter création, modification, affectation, réaffectation, priorité, échéance et annulation avec autorisations serveur.
- [ ] Définir une machine d'état documentée : pending, active, blocked, completed, failed, cancelled ; contrôler toutes les transitions côté serveur.
- [ ] Ajouter description, critères de réussite, dépendances, tentatives, timestamps, agent responsable et historique des changements.
- [ ] Distinguer tâche bloquée, agent inactif, attente de modèle et attente d'approbation.
- [ ] Ajouter réessayer, remettre en attente et réassigner avec confirmation et journal d'audit.
- [ ] Ajouter une vue de détail qui relie la tâche à tous les événements, outils et agents impliqués.
- [ ] Ne déclarer une tâche terminée que sur un signal de réussite vérifiable, pas sur la seule disparition du processus.

#### 1E — Journal d'activité et traçabilité
- [ ] Définir un modèle d'événement persistant et structuré : id, date UTC, agent, tâche, type, niveau, source, résumé, détails expurgés et corrélation d'exécution.
- [ ] Enregistrer les transitions d'état, appels LLM (métadonnées seulement), outils, débuts/fins/erreurs, reprises, validations humaines et opérations opérateur.
- [ ] Ajouter un identifiant de corrélation commun à une boucle, une tâche et ses appels d'outils.
- [ ] Construire une chronologie par agent, par tâche et globale.
- [ ] Ajouter filtres, recherche textuelle, export JSON/CSV et politique de rétention.
- [ ] Prévoir une diffusion live via Server-Sent Events ou WebSocket après stabilisation de l'API ; conserver une stratégie de repli par polling.
- [ ] Ne jamais journaliser clés API, jetons d'authentification, variables secrètes ou contenus sensibles non nécessaires.
- [ ] Distinguer événement confirmé, diagnostic estimé et donnée absente.

#### 1F — Pilotage et interventions humaines
- [ ] Centraliser les actions : démarrer, arrêter, redémarrer, mettre en pause/reprendre si le runtime le permet, annuler une tâche et relancer une tâche échouée.
- [ ] Ajouter des confirmations contextualisées indiquant l'agent, la tâche et les conséquences de l'action.
- [ ] Afficher le résultat réel de chaque commande : acceptée, en cours, terminée ou refusée, avec motif.
- [ ] Ajouter une file d'approbations humaines pour les actions sensibles, avec contexte, risque, agent demandeur, expiration et décision.
- [ ] Ajouter un arrêt d'urgence global toujours accessible, son état verrouillé et une procédure explicite de réarmement réservée à l'administrateur.
- [ ] Ajouter opérations groupées uniquement pour les actions idempotentes et autorisées ; demander confirmation renforcée pour les actions de masse.
- [ ] Empêcher les doubles clics et les commandes concurrentes ; rendre les actions idempotentes ou détecter les répétitions.
- [ ] Afficher le rôle connecté, ses permissions et un bouton de déconnexion ; ne jamais faire confiance aux contrôles UI seuls.

#### 1G — Ressources et santé du système
- [ ] Construire une page système : CPU/RAM de l'hôte, Docker, conteneurs, stockage workspace, nombre de processus, uptime et espace disque.
- [ ] Afficher pour chaque agent ses limites configurées et ses mesures réellement observées.
- [ ] Afficher consommation de tokens par agent, tâche et période, ainsi que quota, restant et rythme de consommation.
- [ ] Distinguer mesure instantanée, cumul, estimation et valeur non disponible.
- [ ] Déclencher des alertes configurables : heartbeat périmé, quota proche, mémoire élevée, disque faible, conteneur absent, erreur répétée.
- [ ] Ajouter graphiques temporels et historique de santé avec granularité adaptée.
- [ ] Ne pas exposer une fausse précision : documenter fréquence d'échantillonnage et source de chaque métrique.

#### 1H — UX, accessibilité et fiabilité du dashboard
- [ ] Uniformiser navigation, composants, couleurs de statut, dates, fuseaux horaires, tableaux, formulaires et notifications.
- [ ] Finaliser responsive desktop/tablette/mobile, états vides, chargements, erreurs réseau et données périmées.
- [ ] Ajouter pagination côté serveur pour les gros historiques ; éviter de charger tous les logs en mémoire.
- [ ] Ajouter actualisation manuelle, fréquence réglable et indication « dernière mise à jour ».
- [ ] Ajouter raccourcis clavier non dangereux, navigation clavier, contrastes et libellés accessibles.
- [ ] Ajouter tests API et UI pour rôles, transitions de tâches, filtres, actions et affichage des erreurs.
- [ ] Ajouter tests d'intégration de la diffusion live, reconnexion et repli polling.
- [ ] Ajouter tests de non-régression XSS sur tous les contenus fournis par les agents.

**Critères de sortie de la Phase 1**
- En moins de quelques secondes, l'utilisateur peut identifier les agents actifs, leur tâche courante, les erreurs et les interventions requises.
- Toute donnée affichée possède une source, une date et un état de fraîcheur ; aucune progression n'est inventée.
- Une mission peut être suivie de sa création à sa clôture dans une chronologie cohérente.
- Toute action est autorisée côté serveur, confirmée si nécessaire, auditée et reflétée par l'état réel.
- Le dashboard reste utilisable lorsque des agents, tâches et événements sont nombreux, et lorsque le serveur ou Docker est momentanément indisponible.



### Livraison — première salle de contrôle opérationnelle

Branche : `feat/mission-control-ui`.

- [x] Remplacer la vue d'ensemble générique par une salle de contrôle structurée : synthèse, santé opérationnelle, interventions requises, agents actifs et flux d'activité récent.
- [x] Détecter les agents en erreur, les heartbeats manquants ou vieux de plus de 90 secondes, les tâches actives sans agent en cours et l'arrêt d'urgence global.
- [x] Afficher un état « Données insuffisantes » lorsqu'aucun agent n'est enregistré au lieu d'afficher artificiellement un système sain.
- [x] Ajouter l'heure de dernière actualisation et des liens vers Missions, Logs et fiches agents.
- [x] Ajouter `taskCounts` dans `GET /api/dashboard` : compteurs exacts calculés en SQL, indépendants de la limite de 200 tâches renvoyées pour l'affichage.
- [x] Ordonner les tâches renvoyées en donnant priorité aux tâches actives et en attente, puis aux tâches historiques récentes.
- [x] Ajouter des tests HTTP couvrant la structure de la salle de contrôle, les compteurs vides et le comptage exact après création d'une tâche.
- [x] Signaler les tâches en échec comme intervention requise et distinguer visuellement les niveaux d'alerte.
- [x] Validation utilisateur Windows : `npm run build` réussi, `npm test` réussi (46/46 tests) et serveur UI démarré. La vérification visuelle détaillée dans le navigateur reste à faire.

Limites connues : l'état Docker, SQLite, du fournisseur LLM et du superviseur n'est pas encore sondé indépendamment ; il n'est donc pas présenté comme sain. Le flux utilise les logs existants, pas encore un journal d'événements typé. Les alertes sont calculées à partir des champs actuellement persistés ; les approbations et métriques de ressources ne sont pas encore disponibles.

### Livraison — socle initial d'événements structurés

Branche : `feat/mission-control-ui`.

- [x] Ajouter une table SQLite `events` avec horodatage, agent, tâche, type, niveau, source, résumé, détails JSON et corrélation.
- [x] Indexer les événements par date, agent, tâche et type ; empêcher les modifications et suppressions SQL pour préserver le caractère append-only.
- [x] Alimenter automatiquement le journal structuré depuis les logs runtime et les entrées d'audit existantes.
- [x] Appliquer une rédaction de motifs courants de secrets dans le résumé et les détails des événements ; cette protection complémentaire ne remplace pas la rédaction à la source.
- [x] Exposer `GET /api/events` avec authentification, filtres agent/tâche/type/niveau/période et pagination par curseur.
- [x] Connecter la page Journal système à l'API d'événements structurés, avec filtres agent et type.
- [x] Ajouter un test HTTP de lecture opérateur, filtrage par type et navigation entre pages.
- [x] Validation utilisateur Windows du lot initial : build réussi, 49/49 tests réussis et serveur UI démarré.
- [x] Validation utilisateur Windows : build réussi, suite complète réussie (49/49 tests) et serveur UI démarré ; les tests HTTP couvrent la lecture opérateur, les filtres et la pagination de l'API.

Limites : les événements hérités des logs et audits ne contiennent pas encore systématiquement un identifiant de tâche ou de corrélation. Les événements structurés dédiés couvrent maintenant les transitions de tâches, les appels LLM et l'exécution des outils sur la boucle d'agent. La rédaction actuelle est défensive et fondée sur des motifs, pas une garantie de détection de tous les secrets.

### Livraison — corrélation du runtime, du LLM et des outils

Branche : `feat/mission-control-ui`.

- [x] Étendre le journal runtime avec des métadonnées structurées optionnelles : type, source, tâche, corrélation et détails.
- [x] Émettre les transitions de tâche `pending → active` et `active → completed` avec l'identifiant de tâche.
- [x] Instrumenter le début, la fin et l'échec des appels LLM, avec durée et identifiant de corrélation.
- [x] Attacher la tâche et la corrélation aux événements de consommation de tokens.
- [x] Instrumenter les décisions de la constitution et les phases d'exécution des outils, avec durée et résultat.
- [x] Supprimer les arguments bruts des messages de décision d'outil afin de ne pas recopier inutilement commandes et contenus dans les journaux.
- [x] Ajouter un test d'intégration vérifiant que les événements tâche/LLM/outil d'un même cycle partagent la même corrélation.
- [x] Étendre le filtre du Journal système aux transitions de tâches, appels/usage LLM, décisions et exécutions d'outils.
- [x] Validation utilisateur Windows, 18 novembre 2026 : `npm run build` réussi ; `npm test` : 13 fichiers et 49 tests réussis, tous les tests Docker opt-in activés ; `npm run ui` démarre sur `http://127.0.0.1:3000`.

Limites : la corrélation est créée par cycle de décision de l'agent ; les actions hors boucle d'agent et les événements historiques ne reçoivent pas rétroactivement de corrélation. Les logs legacy conservent leur format texte pour compatibilité.

### Livraison — première page de mesures système

Branche : `feat/mission-control-ui`.

- [x] Ajouter une collecte à la demande des métriques hôte : CPU (différence entre deux échantillons), nombre de cœurs, RAM totale/libre/utilisée, uptime et plateforme.
- [x] Mesurer l'espace disque du volume contenant le répertoire de travail de l'UI via `statfs`, en exposant explicitement l'indisponibilité si la plateforme ne fournit pas la mesure.
- [x] Exposer les métriques du processus UI : PID, uptime, RSS, heap et mémoire externe.
- [x] Exposer les limites configurées par sandbox (CPU, RAM, PIDs et timeout) séparément de la consommation observée.
- [x] Collecter les statistiques ponctuelles des conteneurs `leanna-*` via Docker Stats, avec CPU, RAM et PIDs ; borner l'appel Docker et retourner un état indisponible en cas d'échec.
- [x] Ajouter une route authentifiée `GET /api/resources` et une page Ressources dans l'interface.
- [x] Ajouter un test HTTP couvrant la structure des métriques hôte, processus, disque, limites et Docker.
- [ ] Validation utilisateur Windows : build, suite complète et vérification de la page Ressources avec Docker actif et inactif.

Limites : les mesures sont collectées à la demande et ne sont pas encore historisées dans SQLite. Le CPU hôte nécessite deux échantillons pour calculer un pourcentage ; le premier affiche donc une valeur indisponible. La mesure disque concerne le volume qui héberge le répertoire de travail du serveur UI, pas une agrégation de tous les volumes. Les statistiques Docker portent uniquement sur les conteneurs en cours d'exécution dont le nom commence par `leanna-`. La consommation CPU/RAM par agent et les courbes temporelles restent à réaliser.

### Phase 1.5 — Contrat de données et API d'observabilité
**Priorité : P0 · À réaliser en parallèle des vues, avant le temps réel**

- [ ] Définir les contrats TypeScript des agents, tâches, événements, métriques, alertes et approbations.
- [ ] Ajouter une table d'événements append-only avec index par date, agent, tâche, type et corrélation.
- [ ] Ajouter une table de métriques échantillonnées avec source, unité, date et qualité de mesure.
- [ ] Ajouter les champs de progression explicite d'une tâche : étape, message, pourcentage optionnel, date de mise à jour et origine.
- [ ] Ne permettre le pourcentage que si l'agent ou l'outil fournit une mesure justifiée ; sinon afficher une progression qualitative.
- [ ] Exposer des endpoints paginés et filtrables pour événements, tâches, métriques et approbations.
- [ ] Versionner les réponses API et valider les entrées/sorties.
- [ ] Ajouter migrations SQLite rétrocompatibles, tests de migration et stratégie de sauvegarde.
- [ ] Ajouter un endpoint de santé en lecture seule indiquant l'état des composants sans révéler les secrets.
- [ ] Garder l'API compatible avec le polling avant d'introduire le flux temps réel.

**Critères de sortie**
- Le backend fournit des événements persistants et cohérents, pas seulement des logs textuels.
- L'interface peut reconstruire l'historique après un redémarrage.
- Les données manquantes sont représentées comme inconnues, jamais remplacées par des suppositions.

### Phase 2 — Superviseur et fiabilité des agents
**Priorité : P0**

Objectif : passer d'une surveillance périodique à une gestion robuste du cycle de vie.

Travaux :
- [ ] Concevoir un gestionnaire de processus dédié avec états explicites : created, starting, running, stopping, stopped, failed.
- [ ] Distinguer heartbeat absent, agent bloqué, processus mort et sandbox inaccessible.
- [ ] Ajouter un timeout par tâche et par exécution.
- [ ] Ajouter une politique de retry avec backoff exponentiel, jitter et nombre maximal de tentatives.
- [ ] Ajouter une politique de redémarrage configurable par agent ; aucun redémarrage si arrêt d'urgence actif.
- [ ] Empêcher les doubles démarrages et les exécutions concurrentes non autorisées.
- [ ] Réconcilier au démarrage du runtime l'état SQLite avec les conteneurs réellement présents.
- [ ] Gérer proprement les arrêts : signal, délai de grâce, terminaison forcée et mise à jour atomique de l'état.
- [ ] Ajouter des tests de crash, redémarrage du runtime, conteneur absent et base en état incohérent.

Critères de sortie :
- Un redémarrage du serveur ne laisse pas des agents fantômes en statut running.
- Un agent bloqué est détecté et traité selon une politique explicite.
- L'arrêt d'urgence bloque les nouvelles exécutions et les redémarrages automatiques.

### Phase 3 — Sécurité et durcissement
**Priorité : P0 · Avant toute autonomie étendue**

Objectif : réduire les risques liés à l'API, aux conteneurs, aux secrets et aux actions autonomes.

Travaux :
- [ ] Réaliser un audit de toutes les routes et permissions : refus par défaut, validation des entrées et contrôle serveur.
- [ ] Vérifier la protection contre les accès directs aux routes d'administration avec un jeton opérateur.
- [ ] Ajouter expiration/rotation des jetons et une stratégie de révocation.
- [ ] Éviter de conserver les jetons en clair dans le navigateur ; étudier des cookies HttpOnly, Secure et SameSite adaptés au mode local.
- [ ] Ajouter une protection CSRF si l'authentification repose sur des cookies.
- [ ] Restreindre les origines CORS et valider l'en-tête Host ; ne jamais exposer l'UI sans configuration explicite.
- [ ] Redacter clés API, jetons, variables d'environnement et données personnelles dans logs, audit et erreurs.
- [ ] Auditer les commandes Docker, les noms de conteneurs, les chemins et toutes les entrées utilisateur.
- [ ] Réduire les accès au socket Docker : il donne un pouvoir important sur l'hôte et doit être traité comme une frontière de sécurité critique.
- [ ] Vérifier les limites CPU, RAM, PIDs, stockage, filesystem read-only, capabilities et réseau.
- [ ] Ajouter une politique de rétention et de purge des logs/audits.
- [ ] Documenter le modèle de menace et les risques résiduels.

Critères de sortie :
- Tests négatifs sur chaque route privilégiée.
- Aucun secret connu ne ressort dans les logs de test.
- Les limites de sandbox sont testées et documentées.
- Le mode réseau et les permissions sont explicites, jamais activés implicitement.

### Phase 4 — Gestionnaire de ressources
**Priorité : P1**

Objectif : empêcher les agents de dépasser les capacités de la machine et du budget d'inférence.

Travaux :
- [ ] Définir un registre central des ressources disponibles et consommées.
- [ ] Appliquer des quotas CPU, RAM, stockage, PIDs et durée par agent.- [ ] Définir des quotas globaux et des réserves pour le superviseur.
- [ ] Ajouter des budgets de tokens par agent, par tâche et globaux.
- [ ] Réserver les ressources avant démarrage, puis libérer à l'arrêt ou à l'échec.
- [ ] Définir des priorités et une file d'attente lorsque les ressources sont insuffisantes.
- [ ] Ajouter des limites de taille pour les sorties, fichiers et historiques.
- [ ] Prévoir une politique de dégradation contrôlée : pause, refus d'une tâche ou réduction de fréquence.
- [ ] Exposer les consommations et refus dans le dashboard.

Critères de sortie :
- Aucun agent ne peut contourner un quota via une route alternative.
- Les ressources sont libérées même après un crash.
- Les refus pour dépassement de budget sont explicables et auditables.

### Phase 5 — Identité cryptographique et confiance entre agents
**Priorité : P1**

Objectif : donner à chaque agent une identité locale vérifiable.

Travaux :
- [ ] Générer une paire de clés Ed25519 par agent.
- [ ] Stocker les clés privées avec permissions minimales et hors des prompts/logs.
- [ ] Signer les manifestes d'identité, messages inter-agents et événements importants.
- [ ] Vérifier les signatures avant d'accepter une instruction d'un autre agent.
- [ ] Introduire un registre de confiance et une procédure de révocation.
- [ ] Lier l'identité au parent, à la version de constitution et au manifeste de capacités.
- [ ] Prévoir rotation et sauvegarde des clés sans usurper l'identité d'un agent.

Critères de sortie :
- Une identité peut être vérifiée sans faire confiance au texte fourni par l'agent.
- Une signature invalide ou une identité révoquée est rejetée et auditée.
- Les secrets privés ne sont jamais exposés au modèle.

### Phase 6 — Outils et permissions granulaires
**Priorité : P1**

Objectif : donner aux agents uniquement les capacités nécessaires à leur mission.

Travaux :
- [ ] Définir un catalogue de capacités versionné.
- [ ] Associer à chaque agent une liste de permissions explicites.
- [ ] Séparer lecture, écriture, exécution, accès réseau et gestion d'autres agents.
- [ ] Ajouter une validation constitutionnelle avant chaque appel d'outil.
- [ ] Introduire des approbations humaines pour les actions à risque.
- [ ] Ajouter des limites d'exécution et des schémas d'entrée/sortie stricts.
- [ ] Ajouter un mode simulation/dry-run pour les opérations sensibles.
- [ ] Journaliser décision, permission, résultat et motif de refus sans enregistrer de secrets.

Critères de sortie :
- Un agent ne peut pas appeler un outil absent de son manifeste de capacités.
- Les opérations sensibles nécessitent l'autorisation attendue.
- Les décisions sont testables sans appeler le modèle.

### Phase 7 — Constitution vérifiable et gouvernance
**Priorité : P0 pour l'autonomie**

Objectif : transformer les règles heuristiques actuelles en politiques structurées, testables et difficiles à contourner.

Travaux :
- [ ] Formaliser les règles en politiques versionnées et structurées.
- [ ] Séparer règles absolues, règles conditionnelles et actions soumises à approbation.
- [ ] Évaluer chaque action dans un moteur de politiques indépendant du LLM.
- [ ] Rendre la constitution immuable depuis les agents et inaccessible à l'auto-modification.
- [ ] Signer les versions de constitution et conserver leur historique.
- [ ] Ajouter une suite de tests adversariaux : prompt injection, commandes indirectes, encodage, chemins détournés et délégation.
- [ ] Ajouter une procédure humaine de changement de constitution, avec revue et journal d'audit.

Critères de sortie :
- Le LLM ne décide jamais seul de ses propres permissions.
- Une règle critique est appliquée hors du modèle et testée.
- Toute évolution de politique est versionnée, signée et attribuable.

### Phase 8 — Mémoire, connaissances et traçabilité
**Priorité : P2**

Objectif : rendre les agents capables de conserver un contexte utile sans transformer la mémoire en source d'autorité.

Travaux :
- [ ] Séparer mémoire de travail, mémoire de tâche et mémoire durable.
- [ ] Stocker provenance, date, agent auteur et niveau de confiance.
- [ ] Ajouter recherche, déduplication, expiration et suppression contrôlée.
- [ ] Distinguer faits observés, hypothèses, décisions et instructions.
- [ ] Éviter qu'un contenu mémorisé puisse modifier la constitution ou les permissions.
- [ ] Ajouter export et sauvegarde des mémoires.

Critères de sortie :
- Chaque élément de mémoire possède une provenance.
- Une mémoire n'est jamais considérée comme une permission.
- Les suppressions et expirations sont effectives et traçables.

### Phase 9 — Coopération et réplication contrôlée
**Priorité : P2 · Après identité et permissions**

Objectif : permettre la création d'agents spécialisés sans propagation incontrôlée.

Travaux :
- [ ] Définir un protocole de messages signé entre agents.
- [ ] Ajouter une file de messages persistante avec accusés de réception et expiration.
- [ ] Définir les relations parent/enfant et les limites de délégation.
- [ ] Exiger un manifeste de mission, capacités, quotas et durée pour chaque agent enfant.
- [ ] Ajouter une approbation selon le niveau de risque avant création ou réplication.
- [ ] Appliquer les limites de profondeur, nombre total d'agents et ressources.
- [ ] Prévoir suspension, révocation et arrêt d'une branche de filiation.
- [ ] Tester les boucles de délégation, duplications et créations concurrentes.

Critères de sortie :
- Aucun agent ne peut créer une chaîne infinie d'agents.
- Chaque enfant a un propriétaire logique, une mission et un budget explicites.
- Une branche peut être suspendue sans désorganiser le reste du système.

### Phase 10 — Auto-évolution contrôlée
**Priorité : P3 · Très haut risque**

Objectif : autoriser l'amélioration du code sans laisser un agent modifier directement le runtime actif.

Travaux :
- [ ] Concevoir un système de propositions de changement, pas d'écriture directe en production.
- [ ] Isoler le dépôt de travail et les secrets du runtime.
- [ ] Exiger diff lisible, justification, risques et plan de retour arrière.
- [ ] Exécuter lint, build, tests unitaires, tests d'intégration et tests de sécurité dans une sandbox dédiée.
- [ ] Ajouter une revue humaine obligatoire avant fusion et déploiement.
- [ ] Signer les artefacts et conserver la provenance du changement.
- [ ] Déployer progressivement avec possibilité de rollback.
- [ ] Interdire toute modification automatique de la constitution, des contrôles d'accès et des mécanismes d'arrêt d'urgence.

Critères de sortie :
- Aucun changement généré par un agent n'est déployé sans validation.
- Un échec de test ou de santé empêche le déploiement.
- Un rollback vers la version précédente est documenté et testé.

### Phase 11 — Exploitation, sauvegardes et distribution
**Priorité : P3**

Objectif : rendre l'installation et l'exploitation durables sans perdre le contrôle local.

Travaux :
- [ ] Fournir des procédures d'installation et mise à jour reproductibles.
- [ ] Ajouter vérification d'intégrité des versions et migrations.
- [ ] Automatiser les sauvegardes SQLite et tester les restaurations.
- [ ] Ajouter diagnostic système, export de rapports et collecte de métriques locales.
- [ ] Définir une politique de compatibilité des versions d'agents et de protocoles.- [ ] Documenter désinstallation, purge et récupération après incident.
- [ ] Préparer une distribution locale simple, sans dépendance à un service cloud propriétaire pour le contrôle du runtime.

Critères de sortie :
- Une installation neuve et une mise à jour sont documentées et reproductibles.
- Une sauvegarde peut être restaurée sur une installation propre.
- L'utilisateur peut exporter ses données et supprimer proprement son instance.

## 4. Ordre d'exécution recommandé

| Ordre | Phase | Pourquoi |
|---:|---|---|
| 1 | Phase 0 — Stabilisation | Garder une base reproductible et testée. |
| 2 | Phase 1 — Centre de contrôle | Rendre chaque agent et chaque mission observables et pilotables. |
| 3 | Phase 1.5 — API d'observabilité | Alimenter l'interface avec des événements persistants et des métriques fiables. |
| 4 | Phase 2 — Superviseur | Fiabiliser le cycle de vie des agents et les états affichés. |
| 5 | Phase 3 — Sécurité | Fermer les risques avant d'augmenter l'autonomie. |
| 6 | Phase 4 — Ressources | Contrôler les limites de la machine et des modèles. |
| 7 | Phase 5 — Identité | Vérifier cryptographiquement les agents. |
| 8 | Phase 6 — Permissions | Restreindre les capacités par agent. |
| 9 | Phase 7 — Constitution | Garantir l'application indépendante des règles. |
| 10 | Phase 8 — Mémoire | Ajouter une mémoire traçable et gouvernée. |
| 11 | Phase 9 — Coopération | Permettre la délégation et la réplication maîtrisées. |
| 12 | Phase 10 — Auto-évolution | N'ouvrir l'évolution du code qu'après les garde-fous. |
| 13 | Phase 11 — Exploitation | Consolider installation, sauvegarde et distribution. |

Les phases 2 et 3 doivent progresser ensemble : la fiabilité ne doit jamais contourner la sécurité. La phase 10 reste bloquée tant que les phases 2 à 7 ne sont pas suffisamment validées.

## 5. Règles de développement à partir de maintenant

1. Une branche Git dédiée par lot cohérent ; ne jamais travailler directement sur `main`.
2. Une fonctionnalité doit inclure ses contrôles d'accès, logs utiles et tests.
3. Ne pas déclarer une fonction terminée sur la seule base de sa présence dans le code.
4. Pour chaque lot : build, tests, scénario manuel pertinent et revue des changements.
5. Ne pas intégrer une phase si ses critères de sortie ne sont pas remplis.
6. Toute modification de schéma SQLite doit prévoir une migration et un chemin de retour documenté.
7. Les changements de sécurité doivent inclure des tests de refus, pas seulement des tests de succès.
8. Garder les secrets hors du dépôt, des logs, des captures et des prompts.
9. Privilégier des lots petits, vérifiables et réversibles.
10. Mettre à jour ce fichier à chaque livraison : statut, commit, tests exécutés, limites connues et prochaine étape.

## 6. Tableau de suivi

| Phase | Statut initial | Prochaine preuve attendue |
|---|---|---|
| 0 — Stabilisation | Validation locale partielle | Build et 45 tests validés sous Windows sur `feat/mission-control-ui` ; CI, sauvegarde/restauration et audit npm restent ouverts. |
| 1 — Centre de contrôle | En cours | Valider la salle de contrôle et poursuivre les vues 1B à 1H. |
| 2 — Superviseur | À faire / partiel | Tests de crash, reprise et réconciliation Docker. |
| 3 — Sécurité | À faire / partiel | Audit des routes, secrets, Docker et tests adversariaux. |
| 4 — Ressources | Partiel | Quotas CPU/RAM/stockage/temps appliqués et mesurés. |
| 5 — Identité | À faire | Clés Ed25519, signatures et révocation vérifiées. |
| 6 — Permissions | Partiel | Manifeste de capacités appliqué à chaque outil. |
| 7 — Constitution | Partiel | Moteur de politiques indépendant et tests adversariaux. |
| 8 — Mémoire | À faire | Provenance, rétention et séparation des types de mémoire. |
| 9 — Coopération | À faire | Messages signés et réplication bornée. |
| 10 — Auto-évolution | À faire | Pipeline sandboxé, validation humaine et rollback. |
| 11 — Exploitation | Partiel | Installation, sauvegarde et restauration reproductibles. |

## 6.1. Avancement du lot dashboard — 18 novembre 2026

Branche de travail : `feat/dashboard-finish`, créée depuis `feat/pro-dashboard-ui`.

Modifications apportées :
- [x] Afficher les tâches existantes dans la page « Toutes les tâches » (la zone était présente mais jamais alimentée).
- [x] Échapper les valeurs dynamiques rendues dans les tableaux HTML afin de limiter l'injection de balisage via les données.
- [x] Afficher le rôle authentifié dans l'en-tête du dashboard.
- [ ] Vérifier l'ensemble des pages et actions dans un navigateur Windows.
- [x] Exécuter build et tests sur Windows : `npm run build` réussi ; `npm test` : 5 tests réussis sur 5 (validation utilisateur).\n- [ ] Vérifier le statut CI de cette branche.
- [ ] Tester les permissions admin/opérateur, l'arrêt d'urgence et le réarmement.

Commits du lot :
- `7ea7371` — rendu de la liste des tâches et échappement des tableaux.
- `2a70270` — simplification/correction du helper d'échappement et affichage du rôle.

Validation rapportée par l'utilisateur sous Windows : `npm install` terminé ; `npm run build` réussi ; `npm test` réussi (1 fichier, 5 tests). `npm run ui` démarre le serveur sur `http://127.0.0.1:3000`. Les pages, les permissions et les scénarios d'arrêt d'urgence restent à vérifier manuellement ; le lot n'est donc pas entièrement validé.\n\nSécurité dépendances : `npm install` a signalé 7 vulnérabilités (1 modérée, 4 élevées, 2 critiques). Aucun `npm audit fix` n'a été exécuté. Il faut examiner le rapport détaillé `npm audit` et les dépendances transitives avant de choisir des mises à jour, sans lancer `--force` à l'aveugle. 

## 7. Prochain lot concret

**Lot recommandé : terminer la validation fonctionnelle du dashboard et traiter les vulnérabilités npm, puis ouvrir le lot de tests API et de durcissement du superviseur.**

1. Récupérer `feat/pro-dashboard-ui`.
2. Exécuter `npm run build` et `npm test`.
3. Lancer `npm run ui` et vérifier toutes les entrées de navigation.
4. Tester les rôles admin et opérateur.
5. Tester l'arrêt d'urgence, le réarmement et le blocage des démarrages.
6. Corriger les défauts constatés, puis seulement ouvrir le lot suivant : tests API et durcissement de l'authentification.

---

**Règle de pilotage :** LeannaAuto doit devenir plus capable seulement au rythme où il devient plus vérifiable, plus isolé et plus facile à arrêter.

## 6.2. Diagnostic de l'audit npm — 18 novembre 2026

Branche de travail : `fix/npm-security-audit`, créée depuis `feat/dashboard-finish`.

Rapport utilisateur :
- [ ] Audit à relancer après correction ; résultat actuel : 7 vulnérabilités (1 modérée, 4 élevées, 2 critiques).
- [x] Les paquets concernés sont dans la chaîne de développement/test, pas dans les dépendances runtime directes.
- [x] Versions identifiées dans le lockfile : `vitest@3.2.7`, `@vitest/mocker@3.2.7`, `vite@7.3.8`, `picomatch@4.0.7`, `tinypool@1.1.1`.

Diagnostic :
- `@vitest/mocker` est vulnérable jusqu'à `4.1.11` selon le rapport ; une version corrigée candidate est `4.1.12`. Le passage de Vitest 3 à 4 est une mise à jour majeure.
- `tinypool` doit être porté au minimum à `2.1.2` pour couvrir les deux avis critiques signalés dans la chaîne de dépendances.
- L'avis ReDoS actuel sur `picomatch` affecte `4.0.7` et ne fournit pas de version corrigée. Ne pas inventer d'override ni prétendre que l'audit peut être entièrement nettoyé tant qu'un correctif éditeur n'est pas publié.
- La documentation Vitest 4 indique Node.js >=20 et Vite >=6 ; la version de Vite verrouillée est 7.3.8. Confirmer la version Node locale avec `node --version` avant la mise à jour.

Décision :
- Aucun `npm audit fix --force` exécuté.
- Aucun changement de dépendance effectué dans ce commit : le lockfile doit être régénéré par npm puis contrôlé avec `npm ci`, `npm run build`, `npm test` et `npm audit`.
- Prochaine action sur cette branche : tester une mise à jour contrôlée de Vitest 4.1.12 et l'override Tinypool 2.1.2 ; documenter explicitement le risque Picomatch restant si aucun correctif n'est disponible.

Mise à jour après confirmation de l'environnement utilisateur :
- [x] Node.js utilisateur : `v24.16.0`, compatible avec Vitest 4.1.12.
- [x] Métadonnées npm vérifiées : Vitest 4.1.12 accepte Vite 6/7/8 et Node >=20, >=22 ou >=24 selon les branches de version.
- [x] `package.json` mis à jour vers `vitest@^4.1.12` (commit `80acc70`). Cette version embarque `@vitest/mocker@4.1.12`, au-delà de la plage vulnérable, et n'utilise plus Tinypool dans sa chaîne de dépendances.
- [ ] Régénérer `package-lock.json` avec `npm install`, puis valider `npm ci`, build, tests et audit sur Windows.
- [ ] Picomatch reste signalé : l'avis GHSA-fc5q-39xc-vjpf couvre jusqu'à 4.0.7 sans version corrigée publiée. Vite 7 utilise encore Picomatch ; ne pas ajouter un override arbitraire. Le risque est limité à l'outillage de développement dans la configuration actuelle, mais doit rester suivi.
- [ ] Ne pas annoncer l'audit nettoyé tant que `npm audit` n'a pas été relancé après régénération du lockfile.



Résultats après régénération du lockfile — validation utilisateur Windows, 18 novembre 2026 :
- [x] `npm install` terminé ; 91 paquets audités.
- [x] `npm ci` terminé ; installation reproductible depuis le lockfile, 91 paquets audités.
- [x] `npm run build` réussi (TypeScript).
- [x] `npm test` réussi : 1 fichier, 5 tests sur 5 avec Vitest 4.1.12.
- [x] Les avis concernant `@vitest/mocker` et `tinypool` ne figurent plus dans le rapport après mise à jour.
- [ ] `npm audit` n'est pas propre : 5 vulnérabilités high restantes dans `picomatch`, transitivement via `fdir`, `tinyglobby`, Vite et Vitest.
- [ ] Ne pas exécuter `npm audit fix --force` : npm propose une rétrogradation majeure vers Vitest 3.1.4, non retenue.
- [ ] Vérifier avec `npm audit --omit=dev` que les dépendances runtime de production ne présentent pas d'avis, et avec `npm ls picomatch --all` la chaîne exacte.
- [ ] Surveiller la publication d'une version corrigée de Picomatch et réévaluer la mise à jour de Vite/Vitest à ce moment.

Conclusion du lot dépendances : installation verrouillée, build et tests validés par l'utilisateur ; réduction de 7 avis (dont 2 moderate/critical groupes initiaux) à 5 avis high liés à Picomatch. Le risque transitif restant n'est pas résolu et l'audit global ne doit pas être qualifié de propre. Le périmètre runtime doit être confirmé séparément par `npm audit --omit=dev`.



Clôture de la vérification runtime — validation utilisateur Windows, 18 novembre 2026 :
- [x] `npm audit --omit=dev` : 0 vulnérabilité. Les dépendances runtime de production ne présentent donc aucun avis dans cet audit.
- [x] `npm ls picomatch --all` confirme que Picomatch 4.0.7 est uniquement dans l'arbre de développement : `vitest@4.1.12` → `vite@8.3.8` / `tinyglobby@0.2.17` → `fdir@6.5.0` → `picomatch@4.0.7`.
- [ ] Le rapport complet `npm audit` conserve 5 avis high liés à Picomatch 4.0.7 dans cette chaîne de développement. Ils ne sont pas corrigés ; continuer à surveiller un correctif amont.
- [x] Décision : ne pas appliquer `npm audit fix --force` ni ajouter un override arbitraire. Conserver Vitest 4.1.12 et le lockfile validé.
Bilan du lot : installation reproductible (`npm ci`), build TypeScript réussi, 5 tests réussis sur 5, audit des dépendances de production sans vulnérabilité. Risque restant circonscrit à l'outillage de développement via Picomatch ; l'audit global n'est pas entièrement propre. Validations exécutées par l'utilisateur sous Windows.


## 6.3. Lot API et superviseur — en cours

Branche : `feat/api-supervisor-hardening`, créée depuis `fix/npm-security-audit`.
Pull request existante : #6, vers `main` ; aucune fusion effectuée.

### API et dashboard
- [x] Extraire les contrôles d'authentification et d'autorisation dans `src/ui-security.ts`, avec comparaison de jetons à temps constant.
- [x] Appliquer une liste d'autorisation explicite par rôle, méthode HTTP et route ; refus par défaut.
- [x] Restreindre les en-têtes Host et Origin aux adresses loopback attendues ; limiter CORS aux origines locales.
- [x] Exiger `application/json` pour les écritures et plafonner les corps JSON à 1 Mio.
- [x] Ajouter des délais de réception HTTP, des en-têtes de sécurité et des réponses d'erreur génériques sans détails internes.
- [x] Échapper les contenus d'agents injectés dans le HTML et retirer les gestionnaires inline des boutons de fiches agents.
- [x] Renvoyer un conflit HTTP 409 lorsqu'un démarrage échoue parce qu'un runtime détient déjà le bail.
- [ ] Tester les refus admin/opérateur avec de vrais appels HTTP sous Windows et vérifier la navigation dans le navigateur.
- [ ] Examiner le stockage du jeton dans `sessionStorage` et mettre en place une stratégie de session plus robuste dans un lot ultérieur.

### Superviseur et cycle de vie
- [x] Ajouter la migration SQLite idempotente de `agents.runtime_owner`.
- [x] Ajouter des baux runtime atomiques : un seul propriétaire peut démarrer un agent dont le heartbeat est encore valide.
- [x] Rafraîchir le heartbeat toutes les 15 secondes, y compris pendant une attente réseau du modèle.
- [x] Permettre au superviseur de reprendre uniquement les agents au heartbeat périmé ; une date invalide est considérée comme périmée.
- [x] Empêcher les démarrages si l'arrêt d'urgence est actif, avec vérification SQLite atomique au moment de la prise du bail.
- [x] Vérifier à nouveau l'arrêt d'urgence après création de la sandbox et l'arrêter en cas de course au démarrage.
- [x] Libérer le propriétaire et le heartbeat lors des arrêts CLI, dashboard, d'urgence ou de fin de boucle.
- [x] Ajouter un délai maximal aux appels d'inférence via `LLM_TIMEOUT_MS` (120 000 ms par défaut).
- [ ] Tester une vraie reprise après arrêt brutal du processus et vérifier qu'aucun runtime concurrent ne subsiste.
- [ ] Tester la reprise après crash Docker et la cohérence des tâches restées au statut `active`.

### Tests et validation
- [x] Ajouter 10 tests unitaires sur les rôles, les routes, les hôtes/origines locales et les limites JSON.
- [x] Ajouter 6 tests unitaires sur les baux runtime, les heartbeats périmés, les propriétaires et l'arrêt d'urgence.
- [x] Build TypeScript et suite complète validés sous Windows après les tests HTTP : `npm run build` réussi ; `npm test` : 5 fichiers, 31 tests réussis (retour utilisateur).
- [x] Workflow CI basculé sur `npm ci` pour installer exactement le lockfile.
- [ ] CI GitHub à confirmer. Les exécutions observées ont échoué avant le démarrage des étapes (aucune étape ni runner assigné dans les métadonnées du job ; logs indisponibles). Ce résultat ne permet pas de conclure à un échec de compilation ou de tests ; vérifier/réexécuter après la validation locale. Les exécutions du 18 novembre (dont le run `44345121441`) échouent immédiatement avec `steps: null` et aucun runner assigné ; logs indisponibles.

### Validation Windows et correction TypeScript — 18 novembre 2026

Retour utilisateur après mise à jour de la branche :
- [x] `npm ci` terminé ; 91 paquets installés, 5 alertes high restantes dans l'arbre de développement (Picomatch).
- [ ] `npm run build` a échoué sur trois erreurs TS2709 dans `src/agent-runtime.ts` : le type d'instance SQLite était déclaré directement comme `Database`, alors que les définitions `better-sqlite3` exposent le type d'instance sous `Database.Database`.
- [x] Correction appliquée : alias explicite `SqliteDatabase = DatabaseConstructor.Database` utilisé par les trois fonctions de bail runtime. Commit : `082bf0c`.
- [x] `npm test` réussi selon le retour utilisateur : 4 fichiers, 26 tests.
- [x] `npm run ui` démarre le serveur sur `http://127.0.0.1:3000`.
- [ ] Rejouer `npm run build` après le commit de correction ; le build de la correction n'est pas encore validé.
- [ ] Effectuer les scénarios API et de reprise après crash listés ci-dessous.

Attention environnement local : Git a signalé des modifications non commitées dans `.gitignore` et `package-lock.json`. Les conserver et les examiner séparément ; ne pas les écraser lors de la synchronisation de la correction.

Validation utilisateur Windows après correction `082bf0c`, 18 novembre 2026 :
- [x] `git pull` : branche à jour.
- [x] `npm run build` : TypeScript compile sans erreur.
- [x] `npm test` : 4 fichiers et 26 tests réussis.
- [x] Le blocage TS2709 de `src/agent-runtime.ts` est levé.
- [ ] Les tests HTTP réels, les refus admin/opérateur sur serveur et les scénarios de reprise après crash restent à effectuer.
- [ ] Ne pas considérer le lot API/superviseur comme terminé avant ces scénarios.

### Tests HTTP d'intégration ajoutés — 18 novembre 2026

- [x] Ajouter `tests/ui-http.test.ts` qui démarre le vrai serveur UI avec une base SQLite temporaire et des jetons de test.
- [x] Couvrir la lecture dashboard par opérateur, le refus d'une création d'agent par opérateur, la création par administrateur, le rejet d'un Content-Type non JSON et le rejet de Host/Origin non fiables.
- [x] Exécuter les tests HTTP sur Windows : les 5 scénarios passent, y compris le rejet Host/Origin non fiables.
- [x] Vérifier le démarrage et l'arrêt du processus de test sur Windows : le fichier d'intégration termine normalement.
- [ ] Ajouter ensuite les scénarios runtime de reprise après arrêt brutal et de conteneur Docker absent.

Commit tests : `2545a5f`.

Résultat du premier passage des tests HTTP sous Windows :
- [x] `npm run build` réussi.
- [x] 30 tests réussis sur 31 ; les quatre autres fichiers passent.
- [x] Les quatre scénarios HTTP d'authentification, rôles et Content-Type passent.
- [x] Le scénario Host/Origin a exposé une limite du test : Node `fetch` n'a pas envoyé le Host personnalisé attendu.
- [x] Test corrigé pour envoyer Host via `node:http` et vérifier séparément le rejet Origin. Commit correctif : `9dfe895`.
- [x] Validation utilisateur après le correctif `9dfe895` : `npm run build` réussi ; `npm test` réussi, 5 fichiers et 31 tests sur 31.
- [x] Le test Host personnalisé via `node:http` et le test Origin malveillante passent tous les deux.

### Réconciliation des sandboxes Docker — tests automatisés validés

Validation utilisateur Windows, 18 novembre 2026 :
- [x] `git pull` : branche à jour.
- [x] `npm run build` : TypeScript compile sans erreur.
- [x] `npm test` : 6 fichiers réussis, 36 tests sur 36.
- [x] Les 5 tests de réconciliation Docker passent, couvrant conteneur actif, arrêté, absent, daemon indisponible et échec de démarrage.

La validation porte sur les tests automatisés avec exécuteur Docker simulé. Les scénarios manuels avec un vrai daemon Docker et une interruption brutale de processus restent à effectuer.

### Réconciliation des sandboxes Docker — en cours

Objectif : rendre la reprise d'un agent déterministe et éviter qu'une panne du daemon Docker soit confondue avec la disparition d'un conteneur.

- [x] Extraire la réconciliation Docker dans une fonction testable avec un exécuteur injectable.
- [x] Laisser intact un conteneur déjà en cours d'exécution.
- [x] Redémarrer un conteneur existant mais arrêté au lieu d'en créer un second.
- [x] Recréer un conteneur uniquement lorsque Docker confirme explicitement qu'il n'existe plus.
- [x] Réutiliser le volume persistant `leanna-<agent>-workspace` lors de la recréation.
- [x] Propager les erreurs de daemon indisponible et les échecs de démarrage au lieu de les masquer.
- [x] Ajouter 5 tests unitaires ciblant ces états Docker.
- [x] Build et suite complète validés sous Windows : 6 fichiers, 36 tests réussis (retour utilisateur).
- [ ] Effectuer un test manuel avec Docker : arrêter un conteneur, relancer l'agent et vérifier qu'il est redémarré ; supprimer ensuite le conteneur (sans supprimer son volume) et vérifier sa recréation.
- [ ] Tester une vraie interruption brutale du processus superviseur et confirmer qu'un seul runtime reprend le bail.

Commits :
- `e968810` — extraction de la réconciliation et distinction conteneur absent / daemon indisponible.
- `e8ad2ee` — ajout des tests de réconciliation Docker.
- `4716989`, `3dd6315`, `6390b73` — typage des doubles de test et correction du séparateur de sortie shell.

### Continuité des tâches après reprise de bail — tests ajoutés

- [x] Étendre les tests du bail runtime pour vérifier qu'une reprise après heartbeat périmé ne réinitialise pas une tâche déjà `active`.
- [x] Vérifier que l'ancien propriétaire ne peut ni rafraîchir ni libérer le bail après la reprise par un nouveau propriétaire.
- [x] Exécuter la suite étendue sous Windows : `npm run build` réussi ; `npm test` : 6 fichiers et 36 tests réussis (validation utilisateur, 18 novembre 2026).
- [ ] Valider avec une interruption réelle du processus que le superviseur reprend l'agent et que sa tâche active continue sans être dupliquée.

Commit : `fa7cdc5`.

### Prochaine validation utilisateur

Build et tests automatisés validés sous Windows le 18 novembre 2026. La prochaine étape porte sur les scénarios manuels API et la reprise réelle du runtime après crash.

Depuis PowerShell :

```powershell
git fetch origin
git checkout feat/api-supervisor-hardening
git pull
npm ci
npm run build
npm test
npm run ui
```

Scénarios manuels prioritaires :
1. Connexion avec jeton opérateur : lecture dashboard, démarrage/arrêt et création de tâche autorisés ; création d'agent et arrêt d'urgence refusés.
2. Connexion avec jeton administrateur : création d'agent et arrêt d'urgence autorisés.
3. Vérifier que le dashboard fonctionne via `http://127.0.0.1:3000` et `http://localhost:3000`, mais refuse un Host/Origin non local.
4. Démarrer deux fois le même agent : le second appel doit être refusé avec HTTP 409.
5. Vérifier qu'un arrêt manuel et l'arrêt d'urgence libèrent le runtime et empêchent toute nouvelle action d'outil.6. Sur une base SQLite existante, confirmer que la migration `runtime_owner` se déroule sans perte de données.

Le lot reste en cours jusqu'à la validation Windows, la vérification des refus API et un scénario réel de reprise après crash. Aucun changement n'a été fait sur `main`.


### Validation de la continuité des tâches — Windows, 18 novembre 2026

Validation utilisateur sur `feat/api-supervisor-hardening` :
- [x] `git pull` : branche déjà à jour.
- [x] `npm run build` : compilation TypeScript réussie.
- [x] `npm test` : 6 fichiers réussis, 36 tests sur 36.
- [x] Le test de reprise de bail et de continuité d'une tâche active est inclus dans cette suite verte.

Cette validation confirme le comportement couvert par les tests automatisés. Elle ne remplace pas encore un test de crash réel avec deux processus ni un test sur un daemon Docker réel. Ces scénarios restent ouverts.


## 6.4. Test d'intégration de reprise après crash de processus — validation automatisée Windows

Branche dédiée : `test/supervisor-process-crash-recovery`, créée depuis `feat/api-supervisor-hardening`.

- [x] Ajouter un test multi-processus utilisant une vraie base SQLite temporaire.
- [x] Extraire un cycle de récupération testable dans `src/supervisor.ts` et l'utiliser depuis la commande CLI `supervise`.
- [x] Faire acquérir un bail runtime par un processus Node enfant, puis le terminer de force.
- [x] Lancer le cycle de récupération dans un second processus Node et vérifier la reprise du bail par un nouveau propriétaire.
- [x] Vérifier que la tâche persistante reste au statut `active` et que le compteur de redémarrage est incrémenté.
- [x] Ajouter des tests unitaires pour les heartbeats périmés/invalides et empêcher la programmation de deux reprises simultanées.
- [x] Exécuter les tests sous Windows : `npm run build` réussi ; `npm test` : 8 fichiers et 39 tests réussis (validation utilisateur, 18 novembre 2026).
- [x] Confirmer que l'arrêt forcé du processus fonctionne sous Windows : le test multi-processus termine et le second processus reprend le bail.
- [ ] Ajouter un test de bout en bout avec le véritable `startAgent`, un modèle simulé et une sandbox contrôlée, puis vérifier l'absence de runtime concurrent.
- [ ] Tester séparément la réconciliation avec un daemon Docker réel.

Fichiers ajoutés : `src/supervisor.ts`, `tests/supervisor.test.ts` et `tests/agent-runtime-process.test.ts`. Le cycle CLI utilise désormais la fonction extraite. Le test multi-processus utilise un faux démarrage d'agent qui exerce le vrai mécanisme de bail SQLite ; il valide la reprise après arrêt forcé et la conservation de la tâche active, mais pas encore l'exécution du vrai agent, l'appel LLM ou Docker.

Validation utilisateur Windows, 18 novembre 2026 :
- [x] `npm run build` : TypeScript compile sans erreur.
- [x] `npm test` : 8 fichiers réussis, 39 tests sur 39.
- [x] Le test `agent-runtime-process.test.ts` passe : un processus détenteur du bail est tué, puis un second processus exécute le cycle superviseur et reprend le bail sans réinitialiser la tâche active.
- [ ] Le redémarrage avec le véritable `startAgent`, un modèle simulé et une sandbox contrôlée reste à couvrir.
- [ ] Le test avec un daemon Docker réel reste à effectuer.


## 6.5. Intégration du superviseur avec la boucle réelle d'agent — en cours

Branche dédiée : `test/agent-restart-integration`, créée depuis `test/supervisor-process-crash-recovery`.

Objectif : vérifier que le superviseur ne se contente pas de reprendre le bail SQLite, mais peut relancer la boucle réelle d'agent sans dépendre d'un service LLM ni d'un daemon Docker pendant les tests.

- [x] Extraire une fabrique `createAgentStarter` utilisée par l'entrée de production `startAgent`, avec dépendances externes injectables.
- [x] Ajouter un test qui combine `recoverStaleAgents`, la prise du bail réelle, la boucle d'agent réelle et une sandbox/modèle simulés.
- [x] Vérifier que la tâche active reste active, que l'outil simulé est appelé et que le bail est libéré à l'arrêt.
- [x] Exécuter build et tests sous Windows : `npm run build` réussi ; `npm test` : 9 fichiers et 40 tests réussis (validation utilisateur, 18 novembre 2026).
- [ ] Ajouter un test de concurrence prouvant qu'un second démarrage ne peut pas prendre le bail pendant que la boucle réelle tourne.
- [ ] Tester séparément le démarrage avec un daemon Docker réel.

Limite de ce lot : le test exécute la vraie boucle d'agent et le vrai mécanisme de bail, mais remplace le transport LLM, l'exécuteur Docker et l'action shell par des doubles déterministes. Il ne constitue pas un test de daemon Docker réel ni un appel réseau OpenRouter.

Validation utilisateur Windows, 18 novembre 2026 :
- [x] `npm run build` : compilation TypeScript réussie.
- [x] `npm test` : 9 fichiers réussis, 40 tests sur 40.
- [x] Le test `agent-restart-integration.test.ts` passe : récupération via `recoverStaleAgents`, exécution de la vraie boucle d'agent, appel du modèle simulé et de l'outil simulé, conservation de la tâche active et libération du bail.
- [ ] La concurrence entre deux tentatives de démarrage pendant une boucle réelle reste à tester.
- [ ] Le démarrage avec un daemon Docker réel reste à tester.


## 6.6. Exclusion des démarrages concurrents — test ajouté

Branche dédiée : `test/agent-start-concurrency`, créée depuis `test/agent-restart-integration`.

- [x] Maintenir la vraie boucle d'agent dans un appel modèle simulé bloquant, tout en conservant le bail runtime.
- [x] Tenter un second démarrage du même agent pendant que le premier détient encore le bail.
- [x] Vérifier que le second démarrage est refusé et qu'aucune deuxième boucle/modèle n'est lancée.
- [x] Vérifier que le premier runtime libère le bail après son arrêt contrôlé.
- [x] Exécuter `npm run build` et `npm test` sous Windows après correction : build réussi ; 9 fichiers et 41 tests réussis sur 41 (validation utilisateur, 18 novembre 2026).
- [ ] Tester la réconciliation et le redémarrage avec un daemon Docker réel.

Premier retour Windows : build réussi ; 40 tests réussis sur 41. Le nouveau second test a échoué car la connexion SQLite partagée au niveau du fichier était fermée par le `afterEach` du premier test, puis réutilisée par le second (`TypeError: The database connection is not open`). Ce défaut concernait l'isolation du test, pas une preuve d'échec du verrouillage concurrent.

Correction commit `5bc8f95` : créer une base SQLite mémoire et son schéma avant chaque test, puis fermer uniquement cette instance après le test. Le scénario concurrent libère également son appel modèle bloquant dans un bloc `finally`, afin d'éviter de laisser la boucle d'agent suspendue si une assertion échoue.

Le test utilise la vraie fabrique `createAgentStarter` et le mécanisme SQLite de prise de bail. Le modèle et la sandbox sont simulés pour rendre la concurrence déterministe. Il ne valide pas encore le comportement avec un daemon Docker réel.

### Test d'intégration Docker réel — ajouté, opt-in

Branche dédiée : `test/docker-runtime-reconciliation`, créée depuis `test/agent-start-concurrency`.

- [x] Ajouter un test opt-in utilisant le vrai exécutable Docker et `ensureSandboxWith`.
- [x] Couvrir création, arrêt/redémarrage, suppression/recréation du conteneur et conservation d'un fichier dans le volume workspace.
- [x] Vérifier dans le conteneur les paramètres effectifs : réseau `none`, filesystem racine read-only, mémoire 1 Gio, CPU 1 et limite PIDs 64.
- [ ] Exécuter le test sur une machine avec Docker Desktop/Engine actif après correction.
- [ ] Vérifier le nettoyage du conteneur et du volume de test après succès et échec.

Premier retour utilisateur sous Windows : build réussi ; suite standard 9 fichiers passés, 1 test Docker ignoré (41 tests réussis). À l’exécution opt-in, le test a échoué dès le premier `docker exec` : le test utilisait le nom complet `leanna-<agentId>`, alors que la production tronque l’identifiant à 40 caractères dans `containerName()`. Le conteneur avait donc été créé sous un nom plus court.

Correction commit `13d17fc` : le test applique la même normalisation et troncature que `src/executor.ts` pour le conteneur et son volume. Cette correction du test n’est pas encore validée ; relancer le build, la suite standard et le test Docker opt-in.

Le test est volontairement ignoré par défaut pour ne pas exiger Docker dans la suite standard et ne supprimer que des ressources portant un identifiant aléatoire propre au test. Pour l'activer sous PowerShell : `$env:LEANNAAUTO_DOCKER_INTEGRATION="1"; npm test -- tests/executor-docker.integration.test.ts`. Le test peut télécharger `node:22-bookworm-slim` si l'image n'est pas présente localement. Ne pas exécuter sur un daemon partagé sans comprendre que le test crée puis supprime son propre conteneur et son propre volume. Build et tests après cette correction : en attente du retour Windows.


### Validation Docker réel et intégration agent — 18 novembre 2026

Branche `test/docker-runtime-reconciliation` :
- [x] L'utilisateur a validé `npm run build` sous Windows.
- [x] Suite standard : 10 fichiers, 42 tests réussis.
- [x] Test Docker opt-in : création, redémarrage, recréation et persistance du workspace validés sur un vrai daemon Docker.
- [x] Paramètres effectifs vérifiés : réseau désactivé, racine read-only, 1 Gio RAM, 1 CPU et 64 PIDs.
- [x] Correction du nom de conteneur du test confirmée par l'exécution réelle.

Branche dédiée : `test/agent-docker-end-to-end`, créée depuis `test/docker-runtime-reconciliation`.
- [x] Ajouter un test opt-in qui exécute la vraie boucle `createAgentStarter`, la vraie réconciliation Docker et la vraie commande `shell` dans le conteneur.
- [x] Simuler uniquement la réponse du modèle ; vérifier l'écriture d'un marqueur dans le volume, les limites Docker et la libération du bail SQLite.
- [x] Valider sous Windows le build TypeScript et la suite complète : `npm run build` réussi ; `npm test` : 11 fichiers, 43 tests réussis (retour utilisateur, 18 novembre 2026).
- [x] Exécuter séparément `tests/agent-docker.integration.test.ts` avec `LEANNAAUTO_DOCKER_INTEGRATION=1` : 1 test réussi sur vrai Docker.
- [x] La suite complète a également exécuté les deux tests Docker réels : test agent end-to-end et test de réconciliation/persistance du workspace.

Le test de bout en bout reste opt-in via `LEANNAAUTO_DOCKER_INTEGRATION=1`. Il crée et supprime un conteneur ainsi qu'un volume portant un identifiant aléatoire propre au test. Il ne contacte pas OpenRouter. La validation réelle de l'agent avec un fournisseur LLM et le scénario de crash du processus pendant une exécution Docker restent distincts.

### Reprise d'un agent Docker après crash du processus — validation Windows réussie

Branche dédiée : `test/docker-agent-crash-recovery`, créée depuis `test/agent-docker-end-to-end`.
- [x] Ajouter un scénario opt-in qui acquiert le bail SQLite dans un processus enfant, rend son heartbeat périmé, puis tue brutalement ce processus.
- [x] Faire intervenir `recoverStaleAgents` et la vraie fabrique `createAgentStarter` pour reprendre le bail et relancer la boucle réelle.
- [x] Utiliser un vrai conteneur Docker et la vraie commande `shell` ; vérifier l'écriture du marqueur dans le workspace persistant.
- [x] Vérifier que le compteur de redémarrage augmente, que le bail est libéré à la fin et que la tâche déjà active n'est pas réinitialisée.
- [x] Validation utilisateur Windows, 18 novembre 2026 : `npm run build` réussi.
- [x] Suite standard : 9 fichiers réussis, 41 tests réussis ; 3 fichiers Docker opt-in ignorés (3 tests skipped).
- [x] Test opt-in `tests/agent-docker-crash.integration.test.ts` avec `LEANNAAUTO_DOCKER_INTEGRATION=1` : 1 test réussi sur vrai Docker.

Le test utilise un vrai processus enfant tué brutalement, le superviseur réel, la vraie boucle d'agent et une vraie sandbox Docker. Le modèle reste simulé et le test ne contacte pas OpenRouter. Il teste une reprise après perte du processus propriétaire avant la reprise de tâche, pas un crash au milieu d'une commande shell déjà en cours.


### Commandes Docker orphelines après crash Node — risque confirmé, sérialisation ajoutée

Branche de caractérisation : `test/docker-exec-orphan-recovery`.
Branche de correction : `fix/docker-exec-orphan-lock`, créée depuis la branche de caractérisation.

Caractérisation réelle sur Windows/Docker, 18 novembre 2026 :
- [x] Le processus Node enfant est tué par `SIGKILL` pendant qu'une commande shell longue tourne dans le conteneur.
- [x] La commande d'origine continue après la mort du client Node/Docker.
- [x] Une relance immédiate provoque deux exécutions concurrentes : relevé exact `["started","started","completed","completed"]`.
- [x] Le risque de double effet de bord est donc confirmé ; le comportement ne doit pas être traité comme une annulation implicite.
- [x] Build TypeScript réussi et suite complète : 13 fichiers, 45 tests réussis sur 45, avec les tests Docker opt-in activés.
- [x] Le test de caractérisation isolé réussit et reproduit les deux exécutions concurrentes.
- [x] `npm ci` réussit après synchronisation déjà présente du lockfile ; `npm install --package-lock-only` n'avait aucun changement à produire.
- [ ] Les 5 vulnérabilités high signalées par `npm audit` restent à examiner séparément ; ne pas lancer `npm audit fix --force` sans analyse.

Correction livrée et validée sur `fix/docker-exec-orphan-lock` :
- [x] Ajouter un verrou `flock` exclusif dans le workspace persistant de chaque agent, partagé par toutes les commandes `shell()` de cet agent.
- [x] Garder le verrou dans le processus shell du conteneur, et non dans le processus Node client : si Node est tué, le verrou noyau reste détenu tant que la commande orpheline tourne.
- [x] Passer la commande comme argument séparé au shell pour ne pas construire une chaîne shell à partir de l'entrée utilisateur.
- [x] Renforcer le test Docker pour exiger l'ordre `started, completed, started, completed` après le crash et la relance.
- [x] Validation utilisateur Windows, 18 novembre 2026 : `npm ci` réussi, `npm run build` réussi, `npm test` avec 13 fichiers et 45 tests réussis (tous les tests Docker opt-in activés).
- [x] Test Docker ciblé répété séparément : 1 test réussi ; relevé `["started","completed","started","completed"]`, confirmant que la relance attend la fin de la commande orpheline.
- [ ] Tester fin normale, expiration du timeout client, commande bloquée et arrêt/redémarrage du conteneur.

Le verrou est volontairement par agent : il sérialise les appels shell sur un même workspace, sans bloquer les commandes d'autres agents. `flock` libère automatiquement le verrou à la fin du processus qui l'a acquis ; le fichier de verrou peut rester dans le volume sans conserver un verrou actif. La correction empêche une seconde commande de commencer avant la fin de la précédente ; elle n'annule pas la commande orpheline.
