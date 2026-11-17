<script lang="ts">
  import type { ImageQuestion } from '../lib/db/database';

  let {
    image,
    alt = '',
    class: classe = '',
  }: { image: ImageQuestion; alt?: string; class?: string } = $props();

  let urlAffichage = $state('');

  $effect(() => {
    if (image.url) {
      urlAffichage = image.url;
      return;
    }
    if (image.blob instanceof Blob) {
      const url = URL.createObjectURL(image.blob);
      urlAffichage = url;
      return () => URL.revokeObjectURL(url);
    }
    urlAffichage = '';
  });
</script>

{#if urlAffichage}
  <img src={urlAffichage} {alt} class={classe} />
{/if}
