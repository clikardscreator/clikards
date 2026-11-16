<script lang="ts">
  import Router, { router } from 'svelte-spa-router';
  import NavMenu from './components/NavMenu.svelte';
  import { routes } from './routes';

  let pleinEcran = $derived(
    router.location.startsWith('/scan') || router.location.startsWith('/session'),
  );
</script>

<div class="mise-en-page">
  {#if !pleinEcran}
    <NavMenu />
  {/if}
  <div class="contenu">
    <Router {routes} />
  </div>
</div>

<style>
  .mise-en-page {
    display: flex;
    align-items: stretch;
    min-height: 100vh;
  }
  .contenu {
    flex: 1;
    min-width: 0;
  }
</style>
