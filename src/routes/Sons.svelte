<script lang="ts">
  import PageProvisoire from '../components/PageProvisoire.svelte';
  import RechercheImages from '../components/RechercheImages.svelte';
  import MediathequeSons from '../components/MediathequeSons.svelte';

  const onglets = [
    { id: 'sons', libelle: 'Sons' },
    { id: 'images', libelle: 'Images' },
    { id: 'videos', libelle: 'Vidéos' },
  ] as const;

  type IdOnglet = (typeof onglets)[number]['id'];

  let ongletActif = $state<IdOnglet>('images');
</script>

<section class="mediatheque">
  <h1>Médiathèque</h1>

  <div class="onglets" role="tablist" aria-label="Type de média">
    {#each onglets as onglet (onglet.id)}
      <button
        type="button"
        role="tab"
        aria-selected={ongletActif === onglet.id}
        class:actif={ongletActif === onglet.id}
        onclick={() => (ongletActif = onglet.id)}
      >
        {onglet.libelle}
      </button>
    {/each}
  </div>

  <div class="contenu-onglet">
    {#if ongletActif === 'sons'}
      <MediathequeSons />
    {:else if ongletActif === 'images'}
      <RechercheImages />
    {:else}
      <PageProvisoire
        titre="Vidéos"
        description="Coller un lien de partage YouTube, choisir le début et la fin de l'extrait, poser des marqueurs, lecture en classe avec arrêt automatique."
        jalon="Jalon 4 — extraits vidéo YouTube"
      />
    {/if}
  </div>
</section>

<style>
  .mediatheque {
    max-width: 56rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem;
    text-align: center;
  }
  .onglets {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin: 1.5rem 0 2rem;
    border-bottom: 1px solid var(--border);
  }
  .onglets button {
    padding: 0.6rem 1.1rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.95rem;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .onglets button:hover {
    color: var(--text-h);
  }
  .onglets button.actif {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }
  .contenu-onglet :global(.page-provisoire) {
    margin-top: 0;
  }
</style>
