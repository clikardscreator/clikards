<script lang="ts">
  import type { Question, Son } from '../lib/db/database';
  import ImageApercu from './ImageApercu.svelte';
  import ExtraitAudio from './ExtraitAudio.svelte';

  let { question, sons, onfermer }: { question: Question; sons: Son[]; onfermer: () => void } =
    $props();

  let dialogueEl: HTMLDialogElement | undefined = $state();
  let revele = $state(false);
  let indexImage = $state(0);

  $effect(() => {
    dialogueEl?.showModal();
  });

  function sonDe(sonId: string): Son | undefined {
    return sons.find((s) => s.id === sonId);
  }

  function imagePrecedente() {
    const total = question.images?.length ?? 0;
    if (total > 0) indexImage = (indexImage - 1 + total) % total;
  }

  function imageSuivante() {
    const total = question.images?.length ?? 0;
    if (total > 0) indexImage = (indexImage + 1) % total;
  }

  function fermer() {
    dialogueEl?.close();
  }
</script>

<dialog bind:this={dialogueEl} onclose={onfermer} class="apercu-projection">
  <button type="button" class="bouton-fermer" onclick={fermer} aria-label="Fermer l'aperçu">
    ✕
  </button>

  <div class="scene">
    {#if question.images && question.images.length > 0}
      <div class="diaporama-scene">
        <ImageApercu image={question.images[indexImage]} alt="" class="image-scene" />
        {#if question.images.length > 1}
          <div class="nav-diaporama">
            <button type="button" onclick={imagePrecedente} aria-label="Image précédente">
              ◀
            </button>
            <span>{indexImage + 1} / {question.images.length}</span>
            <button type="button" onclick={imageSuivante} aria-label="Image suivante">▶</button>
          </div>
        {/if}
      </div>
    {/if}

    <p class="enonce-scene">{question.enonce}</p>

    {#if question.audios && question.audios.length > 0}
      <div class="audios-scene">
        {#each question.audios as audioQuestion, index (index)}
          {@const son = sonDe(audioQuestion.sonId)}
          {#if son}
            <div class="extrait-scene">
              <p class="titre-son">{son.titre}</p>
              <ExtraitAudio
                blob={son.blob}
                debut={audioQuestion.debut ?? 0}
                fin={audioQuestion.fin}
              />
            </div>
          {/if}
        {/each}
      </div>
    {/if}

    {#if question.choix.length > 0}
      <div class="choix-scene">
        {#each question.choix as choix (choix.lettre)}
          <div
            class="choix-bouton"
            class:correct={revele && choix.lettre === question.bonneReponse}
          >
            <span class="lettre-choix">{choix.lettre}</span>
            {choix.texte}
          </div>
        {/each}
      </div>
    {/if}

    {#if question.type !== 'sondage' && question.bonneReponse}
      <button type="button" class="bouton-reveler" onclick={() => (revele = !revele)}>
        {revele ? 'Masquer la réponse' : 'Révéler la réponse'}
      </button>
    {/if}
  </div>
</dialog>

<style>
  .apercu-projection {
    width: min(90vw, 56rem);
    max-height: 85vh;
    border: none;
    border-radius: 0.75rem;
    padding: 0;
    background-color: #0f172a;
    color: #fff;
  }
  .apercu-projection::backdrop {
    background-color: rgba(0, 0, 0, 0.6);
  }
  .bouton-fermer {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    border: none;
    background-color: rgba(255, 255, 255, 0.15);
    color: #fff;
    cursor: pointer;
    font-size: 1rem;
    z-index: 1;
  }
  .scene {
    padding: 3rem 2.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    text-align: center;
    overflow-y: auto;
    max-height: 85vh;
    box-sizing: border-box;
  }
  .diaporama-scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .diaporama-scene :global(.image-scene) {
    max-width: 100%;
    max-height: 18rem;
    border-radius: 0.5rem;
    object-fit: contain;
  }
  .nav-diaporama {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
  }
  .nav-diaporama button {
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: none;
    color: #fff;
    border-radius: 0.4rem;
    cursor: pointer;
    padding: 0.2rem 0.6rem;
  }
  .enonce-scene {
    font-size: 1.6rem;
    font-weight: 600;
    max-width: 40rem;
  }
  .audios-scene {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 28rem;
  }
  .extrait-scene {
    background-color: rgba(255, 255, 255, 0.08);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    text-align: left;
  }
  .titre-son {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 0.5rem;
  }
  .extrait-scene :global(.temps) {
    color: rgba(255, 255, 255, 0.7) !important;
  }
  .extrait-scene :global(.piste) {
    background-color: rgba(255, 255, 255, 0.2) !important;
  }
  .choix-scene {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
    width: 100%;
    max-width: 36rem;
  }
  .choix-bouton {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background-color: rgba(255, 255, 255, 0.1);
    font-size: 1.05rem;
    text-align: left;
  }
  .choix-bouton.correct {
    background-color: #15803d;
  }
  .lettre-choix {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 999px;
    background-color: rgba(255, 255, 255, 0.2);
    font-weight: 700;
    flex-shrink: 0;
  }
  .bouton-reveler {
    padding: 0.5rem 1.2rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.4);
    background: none;
    color: #fff;
    cursor: pointer;
    font-size: 0.9rem;
  }
</style>
