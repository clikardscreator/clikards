<script lang="ts">
  let { titre, description, jalon }: { titre: string; description: string; jalon: string } =
    $props();
</script>

<section class="page-provisoire">
  <h1>{titre}</h1>
  <p class="description">{description}</p>
  <p class="jalon">Fonctionnalité prévue : {jalon}</p>
</section>

<style>
  .page-provisoire {
    max-width: 40rem;
    margin: 3rem auto;
    padding: 0 1.5rem;
    text-align: center;
  }
  h1 {
    margin-bottom: 0.5rem;
  }
  .description {
    color: var(--text);
  }
  .jalon {
    display: inline-block;
    margin-top: 1.5rem;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    background-color: var(--accent-bg);
    color: var(--accent);
    font-size: 0.85rem;
  }
</style>
