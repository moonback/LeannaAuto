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
| Dashboard | En place, refonte en cours | Vue d'ensemble, agents, tâches, logs, quotas, audit, supervision, workspace et sécurité. |
| Identité | Partielle | Empreinte d'identité ; pas encore de clés Ed25519 et de signatures vérifiables. |
| Auto-évolution | Non livrée | Pas de système sûr de proposition, revue, test et déploiement de modifications. |
| Réplication contrôlée | Non livrée | La création d'un agent enfant ne constitue pas encore une réplication opérationnelle complète. |

Validation utilisateur rapportée pour la branche précédente : `npm run build` réussi et `npm test` avec 5 tests réussis. La refonte UI de la branche `feat/pro-dashboard-ui` doit être vérifiée séparément sur l'environnement Windows avant d'être considérée comme validée.

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

### Phase 1 — Dashboard professionnel et pilotage complet
**Priorité : P1**

Objectif : faire de l'interface le centre de contrôle opérationnel.

Travaux :
- [ ] Finaliser le design responsive et vérifier chaque page.
- [ ] Ajouter une fiche agent détaillée : identité, statut, mission, parent, heartbeat, ressources, tâches, erreurs et historique.
- [ ] Ajouter recherche, filtres, tri et pagination aux listes d'agents, tâches, logs et audits.
- [ ] Ajouter des vues détaillées des tâches : attente, exécution, réussite, échec, durée et agent assigné.
- [ ] Afficher l'utilisation des tokens par agent et dans le temps.
- [ ] Afficher les limites CPU/RAM/processus et leur consommation réelle lorsqu'elle est disponible.
- [ ] Ajouter des états vides, chargements, erreurs et confirmations explicites.
- [ ] Ajouter un indicateur clair du rôle connecté et une action de déconnexion.
- [ ] Ajouter une page de configuration qui distingue paramètres effectifs, variables manquantes et valeurs par défaut.
- [ ] Conserver le workspace en lecture seule tant que les contrôles d'accès et d'isolation ne sont pas renforcés.

Critères de sortie :
- Toutes les pages ont un comportement cohérent sur desktop et mobile.
- Chaque action sensible est confirmée, autorisée côté serveur et journalisée.
- Les données affichées correspondent à l'état réel de la base et des sandboxes.

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
- [ ] Appliquer des quotas CPU, RAM, stockage, PIDs et durée par agent.
- [ ] Définir des quotas globaux et des réserves pour le superviseur.
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
- [ ] Définir une politique de compatibilité des versions d'agents et de protocoles.
- [ ] Documenter désinstallation, purge et récupération après incident.
- [ ] Préparer une distribution locale simple, sans dépendance à un service cloud propriétaire pour le contrôle du runtime.

Critères de sortie :
- Une installation neuve et une mise à jour sont documentées et reproductibles.
- Une sauvegarde peut être restaurée sur une installation propre.
- L'utilisateur peut exporter ses données et supprimer proprement son instance.

## 4. Ordre d'exécution recommandé

| Ordre | Phase | Pourquoi |
|---:|---|---|
| 1 | Phase 0 — Stabilisation | Éviter d'empiler des fonctions sur une base fragile. |
| 2 | Phase 1 — Dashboard | Rendre l'état et les opérations visibles. |
| 3 | Phase 2 — Superviseur | Fiabiliser le cycle de vie des agents. |
| 4 | Phase 3 — Sécurité | Fermer les risques avant d'augmenter l'autonomie. |
| 5 | Phase 4 — Ressources | Contrôler les limites de la machine et des modèles. |
| 6 | Phase 5 — Identité | Vérifier cryptographiquement les agents. |
| 7 | Phase 6 — Permissions | Restreindre les capacités par agent. |
| 8 | Phase 7 — Constitution | Garantir l'application indépendante des règles. |
| 9 | Phase 8 — Mémoire | Ajouter une mémoire traçable et gouvernée. |
| 10 | Phase 9 — Coopération | Permettre la délégation et la réplication maîtrisées. |
| 11 | Phase 10 — Auto-évolution | N'ouvrir l'évolution du code qu'après les garde-fous. |
| 12 | Phase 11 — Exploitation | Consolider installation, sauvegarde et distribution. |

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
| 0 — Stabilisation | En cours | Validation Windows et CI de la branche UI actuelle. |
| 1 — Dashboard | En cours | Vérification fonctionnelle de toutes les pages et actions. |
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

