# Changements à porter dans l'autre projet (duplication Claude Code)

> Contexte : ce projet (`CLIKARDS`) a été développé en session dans l'ordre ci-dessous. Tu es
> revenu sur la décision « sans identification Google » pour repartir sur la version avec connexion
> utilisateur (section 7 bis du cahier des charges), dans un second projet dupliqué. Ce document
> liste tout ce qui a été fait ici, avec pour chaque point une indication claire : **à porter tel
> quel**, **à adapter** (à cause du retour à la connexion Google), ou **à ne pas porter**.
>
> Je n'ai pas accès au chemin de l'autre projet dans cette session : ce fichier sert de référence à
> copier/adapter manuellement (ou à me donner en contexte si tu ouvres une session Claude Code dans
> l'autre dossier).

---

## 1. Socle qualité (jalon 0) — à porter tel quel

Si l'autre projet n'a pas encore cet outillage :

- **ESLint** (flat config, `eslint.config.js`) : `@eslint/js` + `typescript-eslint` +
  `eslint-plugin-svelte` (`flat/recommended`) + `eslint-config-prettier` + `globals.browser` (pour
  que `window`/`HTMLElement`/etc. soient reconnus dans les fichiers `.svelte`).
- **Prettier** (`.prettierrc.json`, `.prettierignore`) : guillemets simples, largeur 100,
  `prettier-plugin-svelte`.
- **Vitest** (`vite.config.ts` bloc `test`) : environnement `jsdom`, `@testing-library/svelte` +
  `@testing-library/jest-dom`, setup dans `src/tests/setup.ts`.
  - ⚠️ Point d'attention Svelte 5 : il faut `resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined`
    dans `vite.config.ts`, sinon `mount()` plante en voulant s'exécuter côté serveur.
- **vite-plugin-pwa** : manifeste en français, `registerType: 'autoUpdate'`.
- **Workflows GitHub Actions** : `.github/workflows/ci.yml` (lint/typecheck/tests/build) et
  `deploy.yml` (déploiement GitHub Pages).
- `vite.config.ts` : `base: '/clikards/'` posé dès le début pour éviter une migration plus tard.

Détails complets : voir `docs/DECISIONS.md`, section « Socle initial (Jalon 0) ».

---

## 2. Routage et menu de navigation — à porter tel quel

- **`svelte-spa-router` v5** (hash routing, dédié Svelte 5). API : pas de store `location`, un objet
  réactif `router` (`router.location`) + actions `link` et `active`.
- Toutes les routes déclarées dans `src/routes/index.ts` : `/`, `/classes`, `/classes/:id`,
  `/banques`, `/sons`, `/session/:id`, `/scan`, `/resultats`, `/cartes`, `/reglages`, `*`
  (introuvable). **Il faudra ré-ajouter `/compte`** (voir section 5 ci-dessous).
- `src/components/NavMenu.svelte` : **menu latéral vertical** (pas horizontal), masqué sur `/scan`
  et `/session/:id` (vues plein écran). Libellé « Bibliothèque » pour `/banques` (pas « Banques »),
  « Médiathèque » pour `/sons`.
- `src/components/PageProvisoire.svelte` : composant générique pour les pages pas encore
  construites, affiche le jalon prévu plutôt que de rester vide.
- Fichiers à copier : `src/App.svelte`, `src/components/NavMenu.svelte`,
  `src/components/PageProvisoire.svelte`, `src/routes/index.ts`, `src/routes/Introuvable.svelte`,
  `src/routes/Accueil.svelte` (boutons Projection/Scanner qui pointent vers `#/session/nouvelle` et
  `#/scan`).

---

## 3. Palette de texte plus claire — à porter tel quel

Le CSS de démo du template `create-vite` (`.hero`, `#next-steps`, etc.) a été entièrement supprimé
de `src/app.css` et remplacé par une palette de variables :

```css
--text: #475569; /* corps de texte */
--text-h: #1e293b; /* titres (au lieu de #08060d quasi noir) */
--text-muted: #64748b; /* texte secondaire */
--accent: #1d4ed8; /* couleur de marque */
--accent-bg: #eef2ff;
--border: #e2e8f0;
color-scheme: light; /* pas de dark mode pour l'instant */
```

Tous les composants (`NavMenu`, `PageProvisoire`, `Accueil`, etc.) utilisent ces variables au lieu
de couleurs codées en dur. À copier : `src/app.css` + vérifier que les composants portés
n'ont pas de couleurs en dur résiduelles.

---

## 4. Recherche d'images (Openverse) — à porter tel quel

Fonctionnalité indépendante de la connexion Google (API publique, aucune clé à créer) :

- `src/lib/images/openverse.ts` : client API Openverse (`api.openverse.org`), images Creative
  Commons/domaine public, fonction `texteAttribution()` pour respecter les licences CC.
- `src/components/RechercheImages.svelte` : champ de recherche + grille de résultats + sélection
  avec attribution.
- `src/routes/Sons.svelte` : page Médiathèque réorganisée en onglets **Sons / Images / Vidéos** (les
  onglets Sons et Vidéos restent des `PageProvisoire` pour l'instant).
- Tests : `src/lib/images/openverse.test.ts`.

Rien à adapter ici, la connexion Google ne change rien à cette fonctionnalité.

---

## 5. Connexion Google — à RECONSTRUIRE (pas à copier depuis cet état du projet)

C'est le point important : la connexion Google a été **implémentée puis retirée** dans ce projet.
L'état actuel de `CLIKARDS` n'a **plus** ce code — il n'y a rien à copier ici, il faut le
reconstruire dans l'autre projet à partir de zéro (ou en récupérant la version dans l'historique Git
de ce dépôt si tu veux repartir de cette base : `git show 1d81f3c` juste avant le commit `1cd5c1b`
qui l'a retirée).

Ce qui existait dans cette implémentation (abandonnée) :

- `src/lib/auth/google.ts` : chargement à la demande du script **Google Identity Services**
  (`accounts.google.com/gsi/client`), bouton officiel via `renderButton`, décodage **côté client
  uniquement** (pas de vérification de signature) du jeton d'identité (`id_token`) pour afficher
  nom/e-mail/photo.
- `src/lib/auth/compte.ts` : store Svelte en mémoire pour le profil connecté (pas de persistance
  localStorage/IndexedDB).
- `src/routes/Compte.svelte` : page `/compte`, affichait un message explicite tant que
  `VITE_GOOGLE_CLIENT_ID` n'était pas configuré.
- `docs/GOOGLE_SETUP.md` : guide pas à pas pour créer son propre identifiant OAuth dans la console
  Google Cloud (écran de consentement, origines autorisées, etc.) — **ce guide est toujours
  pertinent**, à recréer ou réutiliser tel quel dans l'autre projet.
- `.env.example` avait `VITE_GOOGLE_CLIENT_ID=` (en plus de `VITE_GOOGLE_API_KEY=` qui lui reste
  pertinent pour l'import Drive en mode A, voir section 7 du cahier des charges).

**Point à ne surtout pas reproduire** : la demande initiale de faire pointer la sauvegarde vers un
compte **partagé** `clikards@gmail.com` a été refusée (voir section 1 du cahier des charges : ce
compte ne sert pas au stockage de données, et techniquement ça exigerait soit un Drive ouvert à
tout le monde en écriture, soit un serveur avec des identifiants secrets — contraire à la contrainte
« 100 % statique »). La bonne version, conforme à la section 7 bis, est que **chaque enseignant se
connecte avec SON PROPRE compte Google** et que la synchronisation se fasse vers **son propre**
Drive (`appDataFolder`), jamais vers un compte commun.

---

## 6. Classes et élèves (Dexie) — à porter tel quel

Fonctionnalité la plus substantielle de la session, indépendante de la connexion Google (données
locales dans tous les cas, connectées ou non) :

- `src/lib/db/database.ts` : schéma Dexie (`Classe`, `Eleve`), IDs en `crypto.randomUUID()`.
- `src/lib/db/classes.ts` et `src/lib/db/eleves.ts` : CRUD, attribution automatique du numéro de
  carte (1 à 63, **unique par classe, jamais globale** — une carte peut servir dans plusieurs
  classes), validations.
- `src/lib/eleves/analyseListe.ts` : parsing pur d'une liste collée depuis Pronote (« NOM Prénom »,
  gère les noms composés, les accents, le fallback si rien n'est en majuscules).
- `src/routes/Classes.svelte` (liste) et `src/routes/ClasseDetail.svelte` (détail : ajout manuel,
  import par collage, édition du numéro de carte).
- Tests : `src/lib/db/db.test.ts`, `src/lib/eleves/analyseListe.test.ts` — nécessitent
  **`fake-indexeddb`** en dev-dependency et `import 'fake-indexeddb/auto'` dans
  `src/tests/setup.ts` (jsdom n'a pas IndexedDB nativement).

À copier intégralement : `src/lib/db/database.ts`, `src/lib/db/classes.ts`, `src/lib/db/eleves.ts`,
`src/lib/eleves/`, `src/routes/Classes.svelte`, `src/routes/ClasseDetail.svelte`, et ajouter la route
`/classes/:id` dans `src/routes/index.ts`.

---

## 7. Sauvegarde locale (manuelle + automatique) — à ADAPTER selon ce que tu veux garder

Cette fonctionnalité a été construite **spécifiquement parce qu'il n'y avait pas de connexion
Google** (pour répondre au besoin de sauvegarde sans compte). Maintenant que la connexion revient,
deux options :

- **Option A — la garder en complément** : la sauvegarde locale (fichier JSON, manuelle ou
  automatique via File System Access API) reste utile comme solution de repli pour le mode « sans
  compte » explicitement prévu section 7 bis (« L'application reste utilisable sans compte »). Dans
  ce cas, copie telle quelle : `src/lib/db/sauvegarde.ts`, `src/lib/db/sauvegardeAuto.ts`,
  `src/routes/Reglages.svelte`, et la table Dexie `reglages` (ajoutée en **version 2** du schéma
  dans `database.ts`, voir le commentaire dans le fichier pour la bonne pratique de migration Dexie).
- **Option B — la remplacer** : si tu préfères que `/reglages` ne propose que l'export/import manuel
  (pour les utilisateurs non connectés) et laisse la synchronisation automatique au compte Google
  (`appDataFolder`, section 7 bis), ne porte que `exporterSauvegarde`/`restaurerSauvegarde`/
  `analyserSauvegarde` de `sauvegarde.ts`, et laisse `sauvegardeAuto.ts` de côté.

Dans les deux cas, le format d'export JSON (`formatVersion`, `exporteLe`, `classes`, `eleves`) reste
une bonne base pour la fonctionnalité « Export JSON complet (sauvegarde) » prévue section 10, que la
connexion Google existe ou non.

---

## 8. Dépendances ajoutées pendant cette session

À installer dans l'autre projet si absentes (versions utilisées ici, dans `package.json`) :

```
dependencies: dexie ^4.4.7, svelte-spa-router ^5.1.1
devDependencies: fake-indexeddb ^6.2.8, globals ^17.14.0, vite-plugin-pwa ^2.0.0,
  @testing-library/svelte ^5.4.2, @testing-library/jest-dom ^7.0.1
```

(Le reste — eslint, prettier, vitest, svelte, vite — fait partie du socle jalon 0 déjà couvert
section 1 ci-dessus.)

---

## 9. Pas encore fait, dans les deux projets

Pour référence, ce qui reste hors périmètre quelle que soit la version :

- Import CSV par fichier (seul le collage de texte est fait) pour les élèves.
- Réordonnancement par glisser-déposer des numéros de carte.
- Banques de questions (`/banques`), détection de cartes (`/scan`, `/cartes`), diffusion en classe
  (`/session/:id`), résultats/export Pronote (`/resultats`) — tous encore des `PageProvisoire`.
- Import de sons depuis Drive (mode A, lien public) et extraits vidéo YouTube — onglets Sons/Vidéos
  de la Médiathèque encore en placeholder.
