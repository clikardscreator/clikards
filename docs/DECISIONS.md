# Journal des décisions techniques

## Framework d'interface : Svelte

Contexte : CLAUDE.md laisse le choix entre Svelte et Vue 3, à trancher une fois et documenter.

Choix retenu : **Svelte 5** (via `npm create vite -- --template svelte-ts`).

Raisons :

- Empreinte runtime plus légère que Vue (pas de virtual DOM), cohérent avec la contrainte « smartphone milieu de gamme » et le mode hors ligne PWA.
- Syntaxe de composant proche du HTML/JS natif, adaptée à un projet solo sans besoin d'écosystème lourd (store Svelte natif suffisant, pas de dépendance supplémentaire pour l'état global).

## Socle initial (Jalon 0, démarré)

- Scaffold : `npm create vite@latest . -- --template svelte-ts`.
- Serveur de dev configuré dans `.claude/launch.json` pour le panneau de prévisualisation de Claude Code (port 5173, rechargement instantané via Vite HMR).
- Reste à faire pour clore le Jalon 0 : ESLint/Prettier, Vitest, vite-plugin-pwa, workflows CI/déploiement GitHub Pages, page d'accueil déployée.
