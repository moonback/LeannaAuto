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


### Commandes Docker orphelines après crash Node — caractérisation en attente

Branche dédiée : `test/docker-exec-orphan-recovery`, créée depuis `test/docker-agent-crash-recovery`.

- [x] Ajouter un test Docker opt-in qui lance une commande longue via `shell()` depuis un processus Node enfant.
- [x] Tuer le processus Node propriétaire pendant que la commande Docker est en cours, puis lancer une seconde exécution identique.
- [ ] Exécuter le test sur Windows avec Docker actif et déterminer si la première commande continue côté conteneur.
- [ ] Confirmer si la commande de reprise chevauche la première et peut donc dupliquer ses effets.
- [ ] Si le chevauchement est reproduit, concevoir une exclusion mutuelle persistante côté sandbox qui reste détenue tant que la commande orpheline tourne.
- [ ] Tester le verrouillage en cas de fin normale, crash du client Docker, commande bloquée et arrêt/redémarrage du conteneur.

Le test de caractérisation est opt-in via `LEANNAAUTO_DOCKER_INTEGRATION=1` et utilise uniquement un conteneur et un volume au nom aléatoire, supprimés au nettoyage. Aucun changement de comportement de production n'est encore effectué : la survie d'une commande après la mort de son client Node reste une hypothèse à mesurer sur le daemon Docker cible.


Premier retour Windows, 18 novembre 2026 :
- `npm ci` a échoué car le lockfile référence Vitest 3.2.7 alors que `package.json` exige Vitest 4.1.12 ; les versions de Vite et plusieurs dépendances transitives sont également désynchronisées. Le build et les tests ont ensuite tourné avec les dépendances déjà présentes localement, ce qui ne valide pas une installation propre.
- Build réussi avec l'installation existante.
- La suite a compté 44 tests réussis et 1 échec ; le test de caractérisation Docker a lu zéro ligne d'événement (`starts: 0`, `completions: 0`). Ce résultat ne permet pas de conclure sur la survie de la commande orpheline.
- Les trois tests Docker précédemment établis ont passé dans cette exécution.
- [ ] Régénérer et committer `package-lock.json` pour le rendre cohérent avec `package.json`.
- [ ] Rejouer le test de caractérisation avec les assertions de diagnostic ajoutées : vérifier le marqueur avant le crash, vérifier le résultat de la commande de reprise et consigner le nombre d'exécutions observées.
