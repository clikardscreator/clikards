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
- Toutes les routes de la section 4 sont déclarées dans `src/routes/index.ts` : `/`, `/compte`, `/classes`, `/banques`, `/sons`, `/session/:id`, `/scan`, `/resultats`, `/cartes`, `/reglages`, et un catch-all `*` (page « introuvable »).
- Seules `/` (accueil) et `/session/:id` → `Projection.svelte` sont reliées à un contenu réel pour l'instant (page d'accueil). Les autres routes affichent un composant `PageProvisoire` générique indiquant le jalon où la fonctionnalité sera implémentée, pour que la navigation soit complète et compréhensible sans rien faire semblant d'être fini.
- Menu de navigation (`src/components/NavMenu.svelte`) affiché sur toutes les pages sauf `/scan` et `/session/:id` : ces deux vues sont pensées plein écran (caméra du téléphone, projection en classe) et ne doivent pas être encombrées par la barre de menu (logique dans `App.svelte`, via `router.location`).
- Le bouton « Projection » de l'accueil pointe vers `#/session/nouvelle` en attendant le jalon 3 (choix réel d'une classe/banque avant de démarrer une session) ; le bouton « Scanner » pointe vers `#/scan`.
- Tests : `Accueil.test.ts` vérifie les deux liens de l'accueil, `App.test.ts` vérifie que le menu et la route par défaut s'affichent (nécessite `findByRole` car le `Router` charge son composant de façon asynchrone, même pour une route synchrone).
