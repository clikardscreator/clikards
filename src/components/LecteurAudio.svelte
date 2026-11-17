<script lang="ts">
  let { blob }: { blob: Blob } = $props();

  let url = $state('');

  $effect(() => {
    const objectUrl = URL.createObjectURL(blob);
    url = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  });
</script>

{#if url}
  <audio controls preload="none" src={url}>
    <track kind="captions" />
  </audio>
{/if}

<style>
  audio {
    max-width: 16rem;
    height: 2.25rem;
  }
</style>
