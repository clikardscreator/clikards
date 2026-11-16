<script lang="ts">
  import { link } from 'svelte-spa-router';
  import active from 'svelte-spa-router/active';

  const liens: { chemin: string; libelle: string }[] = [
    { chemin: '/classes', libelle: 'Classes' },
    { chemin: '/banques', libelle: 'Banques' },
    { chemin: '/sons', libelle: 'Médiathèque' },
    { chemin: '/resultats', libelle: 'Résultats' },
    { chemin: '/cartes', libelle: 'Cartes' },
    { chemin: '/reglages', libelle: 'Réglages' },
    { chemin: '/compte', libelle: 'Compte' },
  ];
</script>

<header class="entete">
  <nav class="menu-principal" aria-label="Navigation principale">
    <a class="marque" href="/" use:link>Clikards</a>
    <ul>
      {#each liens as lien (lien.chemin)}
        <li>
          <a href={lien.chemin} use:link use:active={{ path: lien.chemin }}>{lien.libelle}</a>
        </li>
      {/each}
    </ul>
  </nav>
</header>

<style>
  .entete {
    border-bottom: 1px solid #e5e5e5;
  }
  .menu-principal {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    max-width: 64rem;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    font-family: system-ui, sans-serif;
  }
  .marque {
    font-weight: 700;
    font-size: 1.1rem;
    color: #1d4ed8;
    text-decoration: none;
    margin-right: auto;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  a {
    color: #333;
    text-decoration: none;
    padding: 0.4rem 0.6rem;
    border-radius: 0.4rem;
    font-size: 0.95rem;
  }
  a:hover {
    background-color: #f3f4f6;
  }
  a:global(.active) {
    background-color: #eef2ff;
    color: #1d4ed8;
    font-weight: 600;
  }
</style>
