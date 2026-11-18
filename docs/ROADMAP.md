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
- [ ] Distinguer explicitement mission de l'agent, tâche courante, prochaine tâche et dernier résultat ; ne jamais présenter une tâche pending comme une tâche en cours.- [x] Ajouter une table SQLite `events` avec horodatage, agent, tâche, type, niveau, source, résumé, détails JSON et corrélation.
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
- [ ] Vérifier la protection contre les accès directs aux routes d'administration avec un jeton opérateur.- [ ] Ajouter expiration/rotation des jetons et une stratégie de révocation.
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
- [ ] Réserver les ressources avant démarrage, puis libérer à l'arrêt ou à l'échec.- [ ] Définir des priorités et une file d'attente lorsque les ressources sont insuffisantes.
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
- [ ] Définir un protocole de messages signé entre agents.- [ ] Ajouter une file de messages persistante avec accusés de réception et expiration.
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

### Livraison — première page de mesures système : validation Windows
Branche : `feat/mission-control-ui`.
Commit de livraison du code : `11a3fb75394a412447048bf8b7c3e2a2567df665`.

- [x] Ajouter la collecte à la demande des métriques CPU et mémoire de l'hôte, uptime, plateforme et nombre de cœurs.
- [x] Mesurer le processus UI : PID, uptime, RSS, heap et mémoire externe.
- [x] Mesurer l'espace disque du volume hébergeant le répertoire de travail du serveur UI, avec état indisponible explicite en cas d'erreur.
- [x] Lire les statistiques des conteneurs Docker `leanna-*` en cours d'exécution et exposer CPU, mémoire et PIDs ; signaler explicitement l'indisponibilité de Docker.
- [x] Exposer les limites configurées du runtime et protéger `GET /api/resources` par authentification et autorisation opérateur/admin.
- [x] Ajouter la page Ressources et les tests HTTP et de contrôle d'accès.
- [x] Validation utilisateur Windows, 18 novembre 2026 : `npm run build` réussi ; `npm test` : 13 fichiers et 50 tests réussis sur 50 ; les tests Docker opt-in réels étaient actifs ; `npm run ui` démarre sur `http://127.0.0.1:3000`.

Limites connues : les mesures sont collectées à la demande et ne sont pas encore historisées. La première mesure CPU peut être indisponible car elle nécessite deux échantillons. Le disque mesuré est celui du volume hébergeant le répertoire de travail du serveur UI, pas une ventilation des workspaces. Les statistiques Docker ne couvrent que les conteneurs `leanna-*` en cours d'exécution. Les mesures CPU/RAM par agent, les courbes temporelles et les alertes restent à construire.

### Livraison — première page de mesures système : validation Windows

Branche : `feat/mission-control-ui`.
Commit de livraison du code : `11a3fb75394a412447048bf8b7c3e2a2567df665`.

- [x] Ajouter la collecte à la demande des métriques CPU et mémoire de l'hôte, uptime, plateforme et nombre de cœurs.
- [x] Mesurer le processus UI : PID, uptime, RSS, heap et mémoire externe.
- [x] Mesurer l'espace disque du volume hébergeant le répertoire de travail du serveur UI, avec état indisponible explicite en cas d'erreur.
- [x] Lire les statistiques des conteneurs Docker `leanna-*` en cours d'exécution et exposer CPU, mémoire et PIDs ; signaler explicitement l'indisponibilité de Docker.
- [x] Exposer les limites configurées du runtime et protéger `GET /api/resources` par authentification et autorisation opérateur/admin.
- [x] Ajouter la page Ressources et les tests HTTP et de contrôle d'accès.
- [x] Validation utilisateur Windows, 18 novembre 2026 : `npm run build` réussi ; `npm test` : 13 fichiers et 50 tests réussis sur 50 ; les tests Docker opt-in réels étaient actifs ; `npm run ui` démarre sur `http://127.0.0.1:3000`.

Limites connues : les mesures sont collectées à la demande et ne sont pas encore historisées. La première mesure CPU peut être indisponible car elle nécessite deux échantillons. Le disque mesuré est celui du volume hébergeant le répertoire de travail du serveur UI, pas une ventilation des workspaces. Les statistiques Docker ne couvrent que les conteneurs `leanna-*` en cours d'exécution. Les mesures CPU/RAM par agent, les courbes temporelles et les alertes restent à construire.


### Correctif — démarrage du dashboard sans authentification
Branche : `feat/mission-control-ui`.

- [x] Ne plus lancer de requêtes dashboard périodiques tant qu'aucun jeton n'est présent dans la session.
- [x] Effacer un jeton de session refusé par l'API et réafficher le formulaire de connexion.
- [x] Ajouter un champ utilisateur masqué associé au champ mot de passe/jeton pour les heuristiques d'accessibilité du navigateur.
- [x] Fournir une favicon SVG intégrée pour éviter une requête `/favicon.ico` sans ressource.
- [x] Ajouter des assertions au test HTTP de la coquille UI.
- [ ] Validation Windows après ce correctif : build, tests et vérification console après chargement avant connexion puis après connexion.

Les avertissements `contentscript.js` / `ObjectMultiplex` sont externes au code servi par LeannaAuto et doivent être comparés avec les extensions du navigateur désactivées si nécessaire. Le nombre de tests attendu passe de 50 à 50 (assertions supplémentaires dans un test existant).


### Correctif — liste des agents vide dans la console
Branche : feat/mission-control-ui.

- [x] Identifier l'arrêt prématuré de refresh() causé par des références DOM obsolètes (nTasks, nTokens, recent) retirées lors de la refonte du dashboard.
- [x] Supprimer les mises à jour de ces éléments inexistants et l'ancien rendu qui écrasait la synthèse des agents actifs.
- [x] Conserver le rendu de la liste « Agents existants » à partir de la réponse GET /api/dashboard.
- [x] Ajouter des assertions au test de la coquille UI pour empêcher le retour de ces références obsolètes.
- [ ] Validation Windows après correctif : build, tests et vérification de la liste des agents existants.

Cause : une exception JavaScript sur le premier élément DOM inexistant interrompait le reste de refresh(), avant le remplissage de agentTable. La requête SQL de l'API lisait bien les agents.


### Livraison en cours — explorateur Workspace sécurisé (lecture seule)

Branche : `feat/workspace-explorer`, créée depuis `main` après intégration du centre de contrôle.

- [x] Remplacer la liste plate limitée à deux niveaux par une navigation dossier par dossier avec fil d'Ariane.
- [x] Afficher les fichiers, dossiers, liens symboliques, tailles et dates de modification ; inclure les fichiers cachés sauf le verrou interne du shell.
- [x] Ajouter une recherche locale dans le dossier affiché et un aperçu du contenu des fichiers.
- [x] Borner les aperçus à 256 Kio et les sorties Docker ; ne proposer aucune écriture, suppression, exécution ou commande terminal.
- [x] Distinguer dossier vide, sandbox absente/arrêtée, Docker indisponible, chemin absent et fichier trop volumineux au lieu de retourner silencieusement une liste vide.
- [x] Valider les chemins relatifs côté serveur ; rejeter les chemins absolus, traversées `..`, antislashs et chemins excessifs.
- [x] Résoudre les chemins dans le conteneur et vérifier leur confinement dans `/workspace` avant de lister ou lire ; ne pas suivre un lien symbolique sortant.
- [x] Ajouter les routes de lecture `GET /api/agents/:id/workspace` et `GET /api/agents/:id/workspace/file`, protégées par les rôles existants.
- [x] Ajouter tests unitaires de validation des chemins et tests HTTP de refus de traversal avant accès Docker.
- [ ] Validation utilisateur Windows : build, suite complète, vérification visuelle du Workspace et navigation sur un agent avec fichiers réels.

Limites : la recherche est locale au dossier courant (pas une recherche plein texte récursive). Les aperçus sont limités à 256 Kio et destinés aux fichiers texte ; le contenu binaire n'est pas encore détecté explicitement. Le service requiert une sandbox Docker démarrée et ne la démarre pas automatiquement. Les liens symboliques sont affichés mais non ouvrables. Le composant ne permet volontairement aucune modification des fichiers.


### Correctif — expressions régulières des routes Workspace

Branche : `feat/workspace-explorer`.

- [x] Corriger les expressions régulières des deux routes GET Workspace : les antislashs excédentaires empêchaient TypeScript et esbuild d'analyser `src/ui.ts`.
- [x] Conserver les chemins et contrôles d'accès des deux routes.
- [ ] Validation utilisateur Windows après correctif : `npm run build`, `npm test` et `npm run ui`.
- [ ] Vérifier la navigation Workspace et l'aperçu d'un fichier réel.

Le rapport utilisateur du 18 novembre 2026 montre que les tests Docker opt-in passaient, mais que le build échouait sur `src/ui.ts:202`. Les tests HTTP ne pouvaient pas démarrer leur serveur Dashboard. Aucune validation après ce correctif n'est encore disponible.


### Validation utilisateur — correctif Workspace, 18 novembre 2026

- [x] `npm run build` réussi sous Windows après correction des expressions régulières.
- [x] `npm test` réussi : 14 fichiers, 54 tests réussis sur 54.
- [x] Tests HTTP : 11/11, dont les routes et contrôles de sécurité Workspace.
- [x] Tests Docker opt-in réels actifs et réussis : intégration agent, récupération après crash, sérialisation des commandes orphelines et réconciliation du conteneur.
- [x] `npm run ui` démarre sur `http://127.0.0.1:3000`.
- [ ] Vérification fonctionnelle visuelle du Workspace dans le navigateur avec un agent contenant des fichiers.

La validation confirme le build, la suite automatisée et le démarrage du serveur. La navigation réelle dans l'interface et l'aperçu d'un fichier restent à vérifier manuellement avant fusion.


### Livraison en cours — gestion des agents et création en modale

Branche : `feat/agents-management-ui`, créée depuis `main` après fusion de la PR #10 (`6389b1d332944beb96153dcb04f08e442d87c843`).

- [x] Remplacer le formulaire permanent « Créer un agent » par une fenêtre modale accessible (dialogue, fermeture explicite, clic sur le fond et touche Échap).
- [x] Garder l'ouverture de la création réservée au rôle administrateur ; la création reste protégée côté API.
- [x] Clarifier les champs du formulaire, ajouter des aides contextuelles et des limites de saisie côté interface.
- [x] Refaire « Agents existants » sous forme de cartes responsive avec nom, identifiant, mission, statut traduit, date de création, heartbeat, redémarrages, parent et dernière erreur.
- [x] Ajouter des indicateurs total / en mission / arrêtés / en erreur.
- [x] Ajouter recherche locale et filtre par statut sans modifier les données serveur.
- [x] Conserver les actions Démarrer, Arrêter et Voir la fiche, avec échappement HTML des données dynamiques.
- [x] Étendre le test HTTP de la coquille UI pour vérifier la présence de la modale, des filtres et des informations agents.
- [x] Validation utilisateur Windows, 18 novembre 2026 : `npm ci` réussi (90 packages) ; audit npm sans vulnérabilité ; `npm run build` réussi.
- [x] Validation utilisateur Windows : `npm test` réussi, 14 fichiers et 54 tests sur 54.
- [x] Les tests Docker opt-in réels sont actifs et réussis : intégration agent, récupération après crash, sérialisation des commandes orphelines (ordre `started → completed → started → completed`) et réconciliation du conteneur.
- [x] `npm run ui` démarre sur `http://127.0.0.1:3000`.
- [ ] Contrôle visuel et fonctionnel dans le navigateur : ouverture/fermeture de la modale, validation formulaire, recherche, filtres et cartes agent.

État de validation : build, suite automatisée et démarrage du serveur confirmés par l'utilisateur sous Windows. Le contrôle visuel des interactions reste à effectuer. La fusion de la PR #10 a été réalisée avant ce lot ; ce lot reste isolé de `main` dans la PR #11.


### Lot — modifier, renommer et supprimer les agents

Branche : `feat/agent-lifecycle-actions`.

- [x] Ajouter l’édition du nom et de la mission depuis une modale réutilisée ; l’identifiant et l’identité cryptographique restent inchangés.
- [x] Ajouter la suppression explicite avec confirmation, réservée à l’administrateur.
- [x] Refuser la suppression d’un agent actif, d’un agent parent ou d’un agent qui possède encore des tâches.
- [x] Supprimer la sandbox Docker et son volume workspace avant de retirer l’agent de SQLite.
- [x] Étendre les tests HTTP aux permissions, à la modification et aux refus de suppression.
- [x] Validation utilisateur Windows : `npm run build` réussi et `npm test` réussi, 14 fichiers et 56 tests sur 56 (18 novembre 2026).
- [ ] Vérification visuelle des actions Modifier et Supprimer dans le navigateur.

Les journaux et événements historiques sont conservés après suppression. Les tâches et les agents enfants doivent être traités explicitement avant de pouvoir supprimer leur agent parent.

### Correctif de test — autorisations du cycle de vie des agents

Branche : `feat/agent-lifecycle-actions`.

- [x] Aligner le test de sécurité avec la nouvelle politique : PATCH et DELETE sur un agent sont autorisés à l'administrateur et refusés à l'opérateur.
- [x] Ajouter une assertion confirmant que même l'administrateur ne peut pas appeler une route POST inconnue.
- [x] Validation utilisateur Windows après correctif : `npm run build` réussi et `npm test` réussi, 14 fichiers et 56 tests sur 56 (18 novembre 2026).

Le premier retour Windows du 18 novembre 2026 confirmait le build et le démarrage UI, mais signalait 55/56 tests réussis. L'échec provenait d'une ancienne assertion qui attendait à tort le refus de DELETE pour l'administrateur, alors que cette permission est désormais nécessaire à la suppression d'agents. Le test a été corrigé ; la suite doit être relancée.


Résultat de validation confirmé par l'utilisateur sous Windows le 18 novembre 2026 : `npm run build` passe ; `npm test` passe avec 14 fichiers et 56 tests réussis sur 56. Les tests Docker opt-in sont actifs et réussis, dont la récupération après crash, la sérialisation de `docker exec` orphelin et la réconciliation du sandbox. `npm ci` avait également indiqué 0 vulnérabilité sur cette branche. Le contrôle visuel des actions Modifier/Supprimer reste à effectuer.


### Refonte UI/UX — bureau immersif des agents

Branche : `feat/immersive-agent-office-ui`.

- [x] Ajouter une navigation dédiée « Bureau IA » dans la console.
- [x] Créer une scène isométrique en CSS 3D, sans dépendance WebGL ni nouvelle dépendance npm.
- [x] Représenter chaque agent par un petit personnage à son poste, avec nom, statut, mission et tâche associée.
- [x] Reconstituer l'arbre hiérarchique à partir de `parent_id`, avec gestion des agents orphelins et prévention des cycles d'affichage.
- [x] Rendre les personnages interactifs : clic pour ouvrir la fiche agent.
- [x] Synchroniser les compteurs et les tâches depuis les données du tableau de bord toutes les cinq secondes.
- [x] Renforcer le système visuel global : arrière-plans, surfaces, navigation, actions, focus clavier et adaptation mobile.
- [x] Étendre le test HTTP de présence de l'interface et de son rendu.
- [ ] Validation utilisateur Windows : `npm ci`, `npm run build`, `npm test`, puis contrôle visuel du Bureau IA sur plusieurs agents avec liens parent/enfant et tâches.
- [ ] Vérifier le rendu sur écran mobile et la navigation clavier.

Le rendu 3D est volontairement réalisé avec CSS (perspective, profondeur, ombres et avatars composés en éléments HTML) afin de rester léger et compatible avec la console locale existante. Aucune donnée agent n'est simulée : la scène utilise les agents et tâches renvoyés par `/api/dashboard`.

### Fusion — cycle de vie des agents

- [x] PR #12 fusionnée dans `main` le 18 novembre 2026.
- [x] Commit de fusion : `886d27239908f5a87633c1096220320aa38dea2d`.


### Gestion des tâches et des missions — CRUD sécurisé

Branche : `feat/task-mission-lifecycle-ui`, empilée sur `feat/immersive-agent-office-ui` (PR #13).

- [x] Ajouter la modification des tâches depuis la page « Toutes les tâches » : titre et description.
- [x] Ajouter la suppression explicite des tâches avec confirmation.
- [x] Refuser côté API et interface la modification ou suppression d'une tâche active.
- [x] Ajouter une modale dédiée pour modifier la mission (objectif) d'un agent.
- [x] Ajouter la suppression de mission sans supprimer l'agent : l'objectif est vidé, l'agent et son identité restent conservés.
- [x] Refuser côté API et interface la modification ou suppression d'une mission tant que l'agent est en cours d'exécution.
- [x] Réserver les mutations de tâches et de missions au rôle administrateur ; la création de tâche existante reste accessible aux opérateurs.
- [x] Journaliser chaque modification et suppression dans l'audit et les événements.
- [x] Ajouter tests HTTP pour édition, suppression, validations, refus opérateur et garde-fous d'exécution active.
- [x] Ajouter tests unitaires des règles d'autorisation.
- [ ] Validation utilisateur Windows : `npm ci`, `npm run build`, `npm test`, puis contrôle visuel des modales et boutons.
- [ ] Vérifier le scénario réel d'une tâche active et d'un agent actif dans Docker avant fusion.

Règles de sécurité : les tâches actives ne peuvent pas être modifiées ou supprimées ; les missions ne peuvent être changées que lorsque l'agent est arrêté. Les suppressions de tâches sont auditables ; les événements historiques append-only ne sont pas supprimés.


### Outil — captures d'écran de toutes les pages UI

Branche : `feat/ui-page-screenshots`.

- [x] Ajouter `scripts/capture-screenshots.mjs`, autonome sans dépendance npm supplémentaire, basé sur le protocole DevTools de Chromium.
- [x] Parcourir les 13 pages de navigation : vue d'ensemble, bureau IA, agents, missions, tâches, supervision, filiation, logs, audit, quota IA, ressources, workspace et sécurité/paramètres.
- [x] Authentifier le navigateur avec `LEANNAAUTO_UI_TOKEN` sans écrire le jeton dans les fichiers de capture.
- [x] Enregistrer une image PNG par page dans `artifacts/screenshots/ui` (dossier personnalisable en argument).
- [x] Ajouter la commande npm `npm run capture:screenshots`.
- [ ] Validation Windows : lancer l'UI, définir le jeton administrateur, exécuter la capture et vérifier les 13 PNG.


### Annulation des tâches et missions en cours

Branche : `feat/cancel-running-work`.

- [x] Ajouter une action administrateur « Annuler » pour les tâches en attente ou actives.
- [x] Lorsqu'une tâche active est annulée, arrêter également son agent, libérer son runtime owner et empêcher la reprise de la tâche.
- [x] Ajouter une action « Annuler la mission » pour les agents en cours : arrêter l'agent, effacer l'objectif et annuler ses tâches en attente ou actives.
- [x] Conserver les tâches terminées et en erreur ainsi que les historiques d'événements.
- [x] Ajouter un statut « Annulée » et un filtre dédié dans la page des tâches.
- [x] Réserver les nouvelles actions d'annulation à l'administrateur et ajouter des tests HTTP de permissions et transitions d'état.
- [ ] Validation Windows : `npm ci`, `npm run build`, `npm test`, puis vérifier les actions sur un agent réellement actif dans Docker.

L'arrêt simple d'un agent reste disponible séparément ; l'annulation d'une mission est destructive pour son objectif et ses tâches non terminées, avec confirmation explicite dans l'interface.
