<script lang="ts">
  import Router, { router } from 'svelte-spa-router';
  import NavMenu from './components/NavMenu.svelte';
  import { routes } from './routes';

  let pleinEcran = $derived(
    router.location.startsWith('/scan') || router.location.startsWith('/session'),
  );
</script>

{#if !pleinEcran}
  <NavMenu />
{/if}
<Router {routes} />
