# Clikards

Application web de sondage en classe sans appareil élève, sur le principe de Plickers : chaque
élève tient une carte-marqueur papier pour répondre A, B, C ou D, l'enseignant scanne la classe
avec son smartphone, les réponses s'affichent en direct sur le vidéoprojecteur.

Par rapport à Plickers, Clikards ajoute :

- des **questions sonores** (reconnaissance d'instrument, de timbre, de style…) et des **extraits
  vidéo YouTube** ;
- l'**import de banques de sons** depuis Google Drive ;
- l'**import/export des banques de questions** (JSON, CSV) pour les partager entre collègues ;
- un **export des résultats compatible Pronote** ;
- une **connexion avec un compte Google personnel** (facultative) pour retrouver ses banques, ses
  classes et ses réglages sur plusieurs appareils — l'application reste utilisable sans compte,
  entièrement en local.

Projet **open source**, 100 % statique, déployé gratuitement sur GitHub Pages. Aucune donnée
nominative d'élève ne quitte l'appareil de l'enseignant (stockage local, chiffré en cas de
synchronisation avec un compte Google).

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre <http://localhost:5173/clikards/>.

Autres commandes utiles :

```bash
npm run build     # build de production (dist/)
npm run preview   # aperçu du build de production
npm test          # tests unitaires (Vitest)
npm run check     # vérification des types (svelte-check + tsc)
npm run lint       # ESLint
npm run format     # Prettier (écrit les corrections)
```

## Connexion avec un compte Google (facultatif)

Le bouton « Se connecter avec Google » (page `/compte`) nécessite un identifiant client OAuth
propre à chaque déploiement. Guide pas à pas : [`docs/GOOGLE_SETUP.md`](docs/GOOGLE_SETUP.md).
Sans configuration, l'application reste pleinement utilisable en mode local (voir la page
`/reglages` pour la sauvegarde manuelle ou automatique des données).

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — cahier des charges complet du projet.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — journal des décisions techniques.
- [`docs/GOOGLE_SETUP.md`](docs/GOOGLE_SETUP.md) — configuration de la connexion Google.

## Stack technique

Vite + TypeScript + Svelte 5, `svelte-spa-router` (routage par hash), Dexie (IndexedDB), Vitest +
Testing Library, ESLint + Prettier, PWA (`vite-plugin-pwa`).

## Licence

Voir [`LICENSE`](LICENSE).
