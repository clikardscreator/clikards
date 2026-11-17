# Journal des décisions techniques

## Framework d'interface : Svelte

Contexte : CLAUDE.md laisse le choix entre Svelte et Vue 3, à trancher une fois et documenter.

Choix retenu : **Svelte 5** (via `npm create vite -- --template svelte-ts`).

Raisons :

- Empreinte runtime plus légère que Vue (pas de virtual DOM), cohérent avec la contrainte « smartphone milieu de gamme » et le mode hors ligne PWA.
- Syntaxe de composant proche du HTML/JS natif, adaptée à un projet solo sans besoin d'écosystème lourd (store Svelte natif suffisant, pas de dépendance supplémentaire pour l'état global).

## Socle initial (Jalon 0)

- Scaffold : `npm create vite@latest . -- --template svelte-ts`.
- Serveur de dev configuré dans `.claude/launch.json` pour le panneau de prévisualisation de Claude Code (port 5173, rechargement instantané via Vite HMR).
- **ESLint** (flat config) : `js.configs.recommended` + `typescript-eslint` + `eslint-plugin-svelte` (preset `flat/recommended`) + `eslint-config-prettier` pour éviter les doublons avec Prettier.
- **Prettier** : config par défaut du projet (guillemets simples, largeur 100) + `prettier-plugin-svelte` pour les fichiers `.svelte`.
- **Vitest** : environnement `jsdom`, `@testing-library/svelte` + `@testing-library/jest-dom` pour les assertions DOM. Point d'attention Svelte 5 : il faut forcer `resolve.conditions: ['browser']` dans `vite.config.ts` quand `process.env.VITEST` est défini, sinon `mount()` tente de s'exécuter côté serveur (`lifecycle_function_unavailable`).
- **vite-plugin-pwa** : `registerType: 'autoUpdate'`, manifeste en français (`lang: 'fr'`), `start_url`/`scope` alignés sur `base: '/clikards/'`. Icônes du manifeste à ajouter avant la mise en production réelle (actuellement vide, le favicon SVG suffit en développement).
- `vite.config.ts` : `base: '/clikards/'` fixé dès maintenant conformément à la structure cible (section 12), pour éviter une migration plus tard. Le routage par hash sera ajouté au jalon 2/3 quand les premières routes apparaîtront.
- Workflows GitHub Actions : `ci.yml` (format, lint, typecheck, tests, build sur chaque PR et push `main`) et `deploy.yml` (build puis déploiement sur GitHub Pages via `actions/deploy-pages`, déclenché sur push `main`).
- Dépôt Git initialisé localement (`main`), premier commit du socle qualité. **Pas encore de dépôt distant sur GitHub** : la page d'accueil n'est donc pas encore « déployée et accessible en ligne » (critère du jalon 0) — nécessite la création du dépôt `clikards` et un premier push, à faire avec l'accord de l'auteur.
- Reste à faire avant de clore complètement le jalon 0 : créer le dépôt GitHub distant, pousser `main`, activer GitHub Pages (source = GitHub Actions) et vérifier le déploiement en ligne.

## Routage et squelette de menus

Contexte : les deux boutons de l'accueil (« Projection » / « Scanner ») ne menaient nulle part ; il fallait un routage et la structure de menus complète (section 4) pour que l'application devienne navigable, avant même d'implémenter les fonctionnalités de chaque jalon.

- Bibliothèque retenue : **`svelte-spa-router` v5** (dédiée à Svelte 5, ~3 ko, routage par hash natif — cohérent avec la contrainte GitHub Pages de la section 12). API v5 : pas de store `location`, mais un objet réactif `router` (`router.location`, `router.querystring`) à lire directement dans le template ; actions `link` (navigation sans préfixe `#`) et `active` (classe `.active` sur le lien courant).
- Routes déclarées dans `src/routes/index.ts` : `/`, `/compte`, `/classes`, `/banques`, `/sons`, `/session/:id`, `/scan`, `/resultats`, `/cartes`, `/reglages`, et un catch-all `*` (page « introuvable »). `/compte` a été retirée puis réintégrée en cours de route (voir plus bas, « Connexion Google »).
- Seules `/` (accueil) et `/session/:id` → `Projection.svelte` sont reliées à un contenu réel pour l'instant (page d'accueil). Les autres routes affichent un composant `PageProvisoire` générique indiquant le jalon où la fonctionnalité sera implémentée, pour que la navigation soit complète et compréhensible sans rien faire semblant d'être fini.
- Menu de navigation (`src/components/NavMenu.svelte`) affiché sur toutes les pages sauf `/scan` et `/session/:id` : ces deux vues sont pensées plein écran (caméra du téléphone, projection en classe) et ne doivent pas être encombrées par la barre de menu (logique dans `App.svelte`, via `router.location`).
- Le bouton « Projection » de l'accueil pointe vers `#/session/nouvelle` en attendant le jalon 3 (choix réel d'une classe/banque avant de démarrer une session) ; le bouton « Scanner » pointe vers `#/scan`.
- Tests : `Accueil.test.ts` vérifie les deux liens de l'accueil, `App.test.ts` vérifie que le menu et la route par défaut s'affichent (nécessite `findByRole` car le `Router` charge son composant de façon asynchrone, même pour une route synchrone).

## Palette de texte et thème

Contexte : le texte (notamment les titres, en `#08060d`, quasi noir) était jugé trop sombre et agressif à l'écran.

- `src/app.css` est l'ancien CSS de démonstration du template `create-vite` (`.hero`, `#next-steps`, `#docs`, `.ticks`…) : entièrement supprimé, plus aucun de ces éléments n'existant dans nos propres pages.
- Nouvelle palette de texte, plus douce, dans `:root` : `--text: #475569` (corps de texte), `--text-h: #1e293b` (titres), `--text-muted: #64748b` (texte secondaire), `--accent: #1d4ed8` / `--accent-bg: #eef2ff` (couleur de marque, reprise de `NavMenu`). Les composants (`NavMenu`, `PageProvisoire`, `Accueil`) utilisent désormais ces variables au lieu de couleurs codées en dur, pour rester cohérents si la palette est retouchée plus tard.
- `color-scheme: light` fixé (plus de media query `prefers-color-scheme: dark`) : l'application n'a pas encore d'habillage sombre, et un affichage clair prévisible est préférable pour une projection en classe. À revoir si un mode sombre est explicitement demandé.

## Connexion Google — implémentée puis retirée (révision du périmètre)

Contexte : une première version de la connexion (Google Identity Services, bouton officiel, page `/compte`) avait été mise en place en avance sur l'ordre des jalons, à la demande de l'auteur. Décision revenue dessus le lendemain : l'auteur a explicitement choisi une application **sans aucune identification Google**, entièrement locale/hors ligne, avec uniquement un accès en lecture à des fichiers Drive publics (sans connexion personnelle).

- Code entièrement retiré : `src/lib/auth/` (google.ts, compte.ts), `src/routes/Compte.svelte`, `docs/GOOGLE_SETUP.md`, la route `/compte` et l'entrée correspondante dans `NavMenu`. `VITE_GOOGLE_CLIENT_ID` supprimé de `.env.example` et de `src/vite-env.d.ts`.
- Le jalon 4 bis (compte personnel, synchronisation Drive, chiffrement, passkey) de la section 7 bis du cahier des charges initial **sort donc du périmètre** de l'application : il n'y aura pas de notion de compte ni de synchronisation multi-appareils. Les données restent locales à l'appareil (IndexedDB), point final.
- Nouveau périmètre pour l'accès aux ressources externes (voir section ci-dessous) : import de sons depuis un dossier Drive **partagé par lien public** (mode A de la section 7, clé API restreinte, pas d'OAuth), recherche d'images libres de droits, et extraits vidéo YouTube (oEmbed + IFrame Player, déjà sans connexion requise). Aucune de ces fonctionnalités ne nécessite une identification de l'utilisateur.
- `VITE_GOOGLE_API_KEY` est conservé dans `.env.example` : c'est une clé API restreinte (lecture Drive uniquement), pas un identifiant de connexion personnelle — cohérent avec le choix « sans identification Google ».

## Connexion Google — réintégrée (second revirement)

Contexte : nouveau changement de décision de l'auteur, un jour après le retrait ci-dessus : retour à une application **avec** connexion Google (section 7 bis), le temps qu'une tentative de la garder entièrement hors-ligne ne corresponde finalement pas à l'usage voulu. Un instant envisagé comme un second projet dupliqué, la demande s'est clarifiée : il s'agit bien du **même projet** `CLIKARDS`, pas d'une fourche séparée.

- Code restauré à l'identique de la version retirée (récupéré depuis l'historique Git, commit `1d81f3c`) : `src/lib/auth/google.ts`, `src/lib/auth/compte.ts`, `src/routes/Compte.svelte`, `docs/GOOGLE_SETUP.md`, route `/compte` + entrée `NavMenu`, `VITE_GOOGLE_CLIENT_ID` dans `.env.example` et `src/vite-env.d.ts`. Voir la section « Connexion Google (jalon 4 bis, amorcé) » plus haut dans l'historique pour le détail technique (Google Identity Services chargé à la demande, jeton d'identité décodé côté client sans vérification de signature, profil en mémoire).
- **La connexion Google et la sauvegarde locale (voir section ci-dessous) coexistent désormais**, et c'est volontaire plutôt qu'un oubli à nettoyer : la section 7 bis exige explicitement que « l'application reste utilisable sans compte (mode local seul) ». La sauvegarde locale (manuelle et automatique) reste donc la solution de repli pour qui n'active pas la connexion, et `/compte` renvoie vers `/reglages` dans les deux sens pour que ce soit visible. La synchronisation automatique vers `appDataFolder` proprement dite (jalon 4 bis complet) reste à construire : pour l'instant la connexion n'affiche qu'un profil, elle ne synchronise rien.
- Point de vigilance pour la suite : une fois la synchronisation Drive ajoutée, décider si elle doit **remplacer** la sauvegarde locale automatique ou s'ajouter en parallèle (la sauvegarde manuelle, elle, reste pertinente dans tous les cas comme export de secours, section 10).
- `docs/CHANGEMENTS_A_PORTER.md` (document écrit en vue d'un portage vers un second projet qui n'existe finalement pas) a été supprimé : son contenu pertinent est repris dans ce journal.

## Recherche d'images : Openverse

Contexte : besoin d'illustrer une question avec une image, sans mettre en place d'identification ni de clé API à créer par l'auteur.

- **Openverse** (`api.openverse.org`) retenu : API REST publique, sans clé requise, qui n'indexe que des images sous licence Creative Commons ou domaine public — adapté à un usage pédagogique en évitant les problèmes de droits d'auteur (contrairement à une recherche d'images généraliste). Pas de guide de configuration nécessaire pour l'auteur.
- Alternatives écartées pour l'instant : Pixabay et Google Custom Search Images nécessitent chacun la création d'une clé API par l'auteur (et un moteur de recherche personnalisé pour Google) — à reconsidérer seulement si la couverture ou la qualité des résultats Openverse s'avère insuffisante à l'usage.

## Classes et élèves (jalon 2, premier volet)

Contexte : première fonctionnalité du jalon 2, et première utilisation réelle du stockage persistant (IndexedDB via Dexie), comme prévu section 5.

- **Dexie** : deux tables `classes` et `eleves`, identifiants UUID (`crypto.randomUUID()`), conformes au modèle de la section 5. Index composé `[classeId+numeroCarte]` pour les requêtes par classe.
- Le contrôle d'unicité du numéro de carte (1 à 63) est fait **en lecture avant écriture**, côté application (pas de contrainte d'unicité Dexie native sur un sous-ensemble de colonnes) : une classe a bien plusieurs numéros 1 à 63, mais deux classes différentes peuvent réutiliser les mêmes numéros (« une même carte peut servir dans plusieurs classes », section 5) — donc l'unicité est **par classe**, jamais globale.
- Import par collage (`src/lib/eleves/analyseListe.ts`, pur, sans dépendance à la base — facile à tester) : convention Pronote « NOM en MAJUSCULES, éventuellement sur plusieurs mots, puis Prénom ». Repli sur « premier mot = nom » si rien n'est détecté en majuscules (cas atypique). Les lignes vides sont ignorées. Une tabulation dans la ligne bascule sur un simple split CSV `NOM<tab>Prénom`.
- Les numéros de carte sont attribués au **premier numéro libre dans l'ordre**, que ce soit à l'ajout manuel ou à l'import en masse — un ajout manuel antérieur n'est jamais réécrit par un import ultérieur.
- Tests Dexie sous Vitest : nécessite le polyfill **`fake-indexeddb`** (`import 'fake-indexeddb/auto'` dans `src/tests/setup.ts`), jsdom ne fournissant pas IndexedDB. Chaque fichier de test vide les tables avant/après (`db.classes.clear()`, `db.eleves.clear()`) pour rester indépendant des autres tests.
- Pas encore fait (volontairement, hors périmètre de ce premier volet) : import CSV par fichier, réordonnancement par glisser-déposer des numéros de carte, export Pronote (viendra avec les résultats, jalon 5).

## Sauvegarde : fichier local, jamais `clikards@gmail.com`

Contexte : demande de sauvegarder vers « le Google Drive clikards@gmail.com ». Refusé et expliqué à l'auteur : ce compte sert uniquement de propriétaire du projet Google Cloud et de contact sur l'écran de consentement OAuth (section 1 du cahier des charges), **pas** au stockage de données. Faire écrire tous les utilisateurs de l'application vers un unique Drive partagé poserait un problème de sécurité majeur (il faudrait soit un Drive ouvert en écriture à tout le monde, soit un serveur avec des identifiants secrets — contraire à la contrainte « 100 % statique, pas de serveur » et à l'absence d'identification Google déjà actée). Choix retenu avec l'auteur : sauvegarde locale par fichier, sans aucune connexion.

- **Sauvegarde manuelle** (`src/lib/db/sauvegarde.ts`) : export JSON versionné (`formatVersion`, horodatage, classes, élèves) téléchargé via `Blob` + `<a download>` ; restauration par sélection d'un fichier, **remplace** entièrement les classes/élèves actuels (c'est une restauration, pas une fusion — l'utilisateur est prévenu avant).
- **Sauvegarde automatique** (`src/lib/db/sauvegardeAuto.ts`), à la demande explicite de l'auteur (« mode sauvegarde auto ») : utilise la **File System Access API** (`showSaveFilePicker` + `FileSystemFileHandle.createWritable()`) pour réécrire un fichier choisi une seule fois par l'utilisateur, à chaque modification (débounce de 2 s, même logique que la synchronisation Drive prévue section 7 bis). Avantage mis en avant dans l'interface : si ce fichier est placé dans un dossier synchronisé par l'app Google Drive de bureau, la sauvegarde se retrouve automatiquement dans le Drive **personnel** de l'enseignant, sans que l'application touche à l'API Google ni ne demande de connexion.
- **Limite technique importante** : la File System Access API n'est disponible que sur les navigateurs basés sur Chromium (Chrome, Edge). Sur Firefox et Safari, la page affiche un message clair et seule la sauvegarde manuelle (téléchargement) est proposée — détection via `'showSaveFilePicker' in window`, pas de bibliothèque de compatibilité ajoutée.
- L'autorisation d'écriture du navigateur sur le fichier choisi **n'est pas retenue d'une session à l'autre** (restriction de sécurité du navigateur, pas un choix du projet) : au rechargement, l'utilisateur doit cliquer une fois sur « Réactiver » pour reconfirmer l'autorisation (`requestPermission`), ce qui nécessite un geste utilisateur et ne peut donc pas être fait silencieusement au chargement de la page.
- Le handle de fichier (`FileSystemFileHandle`) est stocké tel quel dans une nouvelle table Dexie générique `reglages` (clé/valeur), ajoutée en **version 2** du schéma plutôt que modifiée directement en version 1 (bonne pratique de migration Dexie, même si le projet n'a pas encore d'utilisateurs en production).
- Tests : la logique pure (export, validation, restauration) est testée via `fake-indexeddb`. La partie `sauvegardeAuto.ts` dépend d'API navigateur non disponibles sous Vitest/jsdom (et son flux passe par un sélecteur de fichier natif, impossible à peupler par automatisation) : vérifiée manuellement dans le navigateur plutôt que par un test automatisé.

## Banques de questions (jalon 2, second volet)

Contexte : avec les classes déjà en place, il manquait la partie « questions » du jalon 2 — sans elle, aucune séance n'est possible même une fois le scanner et la projection construits (jalons 1 et 3).

- **Schéma Dexie v3** (`banques`, `questions`) : `Question.ordre` sert au tri et au réordonnancement (boutons monter/descendre pour l'instant, comme pour les numéros de carte des classes — le glisser-déposer prévu section 8 reste à faire). `coefficient` (1 par défaut) et `notee` suivent exactement la section 5 ; `type: 'sondage'` force automatiquement `notee: false` et l'absence de `bonneReponse` (normalisation centralisée dans `creerQuestion`/`modifierQuestion`, pas dans l'interface, pour rester correct même via l'import CSV/JSON).
- **Image optionnelle** : réutilise directement `RechercheImages.svelte` (déjà construit pour la médiathèque, recherche Openverse) comme sélecteur dans l'éditeur de question — aucune nouvelle dépendance, l'attribution de licence est copiée automatiquement avec l'image choisie.
- **Export/import JSON** (`src/lib/db/banqueExport.ts`), versionné (`formatVersion: 1`), même principe que la sauvegarde classes/élèves mais pour une banque : l'import crée toujours une **nouvelle** banque avec de nouveaux identifiants (jamais de fusion avec une banque existante), pour éviter d'écraser du travail en cours en cas de ré-import.
- **Export/import CSV** (`src/lib/db/banqueCsv.ts`) : volontairement limité aux questions de type QCM (2 à 4 choix), conformément à la demande « simple, éditable dans un tableur » — un Vrai/Faux ou un sondage n'a pas vraiment de sens dans ce format tabulaire simplifié. Séparateur `;` (cohérent avec l'export Pronote prévu section 10), échappement RFC4180 minimal (guillemets doublés) implémenté à la main plutôt que d'ajouter une dépendance pour ce besoin restreint. L'import CSV **ajoute** des questions à la banque ouverte (pas de nouvelle banque, contrairement au JSON), car un CSV ne porte aucune métadonnée de banque.
- **Duplication d'une banque** (`dupliquerBanque`) : copie la banque et toutes ses questions avec de nouveaux identifiants, dans une transaction Dexie.
- `exemples/banque-timbres-6e.json` : fichier de démonstration (5 questions : 2 QCM, 2 Vrai/Faux, 1 sondage), conforme au format d'export ci-dessus. Un test (`exemples.test.ts`) vérifie qu'il reste importable si le schéma évolue, pour ne pas laisser l'exemple se périmer silencieusement.
- Pas encore fait (volontairement, hors périmètre de ce volet) : réordonnancement par glisser-déposer, lien avec un son ou une vidéo (jalon 4, la médiathèque correspondante n'existe pas encore pour ces deux formats), export CSV incluant Vrai/Faux et sondages.
