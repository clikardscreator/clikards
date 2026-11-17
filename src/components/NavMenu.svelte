<script lang="ts">
  import { link } from 'svelte-spa-router';
  import active from 'svelte-spa-router/active';

  const liens: { chemin: string; libelle: string }[] = [
    { chemin: '/classes', libelle: 'Classes' },
    { chemin: '/banques', libelle: 'Bibliothèque' },
    { chemin: '/sons', libelle: 'Médiathèque' },
    { chemin: '/resultats', libelle: 'Résultats' },
    { chemin: '/cartes', libelle: 'Cartes' },
    { chemin: '/reglages', libelle: 'Réglages' },
  ];
</script>

<aside class="menu-lateral">
  <a class="marque" href="/" use:link>Clikards</a>
  <nav aria-label="Navigation principale">
    <ul>
      {#each liens as lien (lien.chemin)}
        <li>
          <a href={lien.chemin} use:link use:active={{ path: lien.chemin }}>{lien.libelle}</a>
        </li>
      {/each}
    </ul>
  </nav>
</aside>

<style>
  .menu-lateral {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 14rem;
    flex-shrink: 0;
    min-height: 100vh;
    padding: 1.25rem 1rem;
    border-right: 1px solid var(--border);
    font-family: system-ui, sans-serif;
    box-sizing: border-box;
  }
  .marque {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--accent);
    text-decoration: none;
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  a {
    display: block;
    color: var(--text);
    text-decoration: none;
    padding: 0.5rem 0.75rem;
    border-radius: 0.4rem;
    font-size: 0.95rem;
  }
  a:hover {
    background-color: var(--accent-bg);
  }
  a:global(.active) {
    background-color: var(--accent-bg);
    color: var(--accent);
    font-weight: 600;
  }
</style>
