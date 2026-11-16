<script lang="ts">
  import PageProvisoire from '../components/PageProvisoire.svelte';

  let { params }: { params?: { id?: string } } = $props();
</script>

<PageProvisoire
  titre="Diffusion en classe"
  description={`Vue Projection (session « ${params?.id ?? 'nouvelle'} ») : question plein écran, lecture audio, grille des numéros de cartes, révélation des réponses.`}
  jalon="Jalon 3 — diffusion en classe"
/>
