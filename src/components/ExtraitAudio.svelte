<script lang="ts">
  import { formaterTemps } from '../lib/audio/temps';

  let {
    blob,
    debut = 0,
    fin,
    modifiable = false,
    onchange,
  }: {
    blob: Blob;
    debut?: number;
    fin?: number;
    modifiable?: boolean;
    onchange?: (plage: { debut: number; fin: number }) => void;
  } = $props();

  let audioEl: HTMLAudioElement | undefined = $state();
  let pisteEl: HTMLDivElement | undefined = $state();
  let url = $state('');
  let duree = $state(0);
  let tempsActuel = $state(0);
  let enLecture = $state(false);
  let glissement: 'debut' | 'fin' | null = $state(null);

  const ECART_MIN = 0.2;
  const finEffective = $derived(fin ?? duree);

  $effect(() => {
    // Garde défensive : un `blob` invalide (son corrompu, ou limite connue de
    // fake-indexeddb qui ne clone pas un Blob sous jsdom, voir sons.test.ts)
    // ne doit pas faire planter tout le formulaire, juste ne rien afficher.
    if (!(blob instanceof Blob)) {
      url = '';
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    url = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  });

  function pct(valeur: number): number {
    return duree > 0 ? (valeur / duree) * 100 : 0;
  }

  function metadonneesChargees() {
    if (audioEl) duree = audioEl.duration;
  }

  function miseAJourTemps() {
    if (!audioEl) return;
    tempsActuel = audioEl.currentTime;
    if (tempsActuel >= finEffective) {
      audioEl.pause();
      enLecture = false;
      audioEl.currentTime = debut;
      tempsActuel = debut;
    }
  }

  function basculerLecture() {
    if (!audioEl) return;
    if (enLecture) {
      audioEl.pause();
      enLecture = false;
    } else {
      audioEl.currentTime = debut;
      audioEl.play();
      enLecture = true;
    }
  }

  function positionPointeur(evenement: PointerEvent): number {
    if (!pisteEl || duree === 0) return 0;
    const rect = pisteEl.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (evenement.clientX - rect.left) / rect.width));
    return ratio * duree;
  }

  function commencerGlissement(evenement: PointerEvent, poignee: 'debut' | 'fin') {
    if (!modifiable) return;
    evenement.preventDefault();
    glissement = poignee;
    window.addEventListener('pointermove', gererGlissement);
    window.addEventListener('pointerup', finGlissement);
  }

  function gererGlissement(evenement: PointerEvent) {
    if (!glissement) return;
    const position = positionPointeur(evenement);
    const finActuelle = fin ?? duree;
    if (glissement === 'debut') {
      const nouveauDebut = Math.max(0, Math.min(position, finActuelle - ECART_MIN));
      onchange?.({ debut: nouveauDebut, fin: finActuelle });
    } else {
      const nouvelleFin = Math.min(duree, Math.max(position, debut + ECART_MIN));
      onchange?.({ debut, fin: nouvelleFin });
    }
  }

  function finGlissement() {
    glissement = null;
    window.removeEventListener('pointermove', gererGlissement);
    window.removeEventListener('pointerup', finGlissement);
  }

  function clavierGlissement(evenement: KeyboardEvent, poignee: 'debut' | 'fin') {
    if (!modifiable) return;
    const pas = evenement.shiftKey ? 1 : 0.1;
    let delta: number;
    if (evenement.key === 'ArrowLeft') delta = -pas;
    else if (evenement.key === 'ArrowRight') delta = pas;
    else return;
    evenement.preventDefault();
    const finActuelle = fin ?? duree;
    if (poignee === 'debut') {
      onchange?.({
        debut: Math.max(0, Math.min(debut + delta, finActuelle - ECART_MIN)),
        fin: finActuelle,
      });
    } else {
      onchange?.({
        debut,
        fin: Math.min(duree, Math.max(finActuelle + delta, debut + ECART_MIN)),
      });
    }
  }
</script>

<div class="extrait-audio">
  <audio
    bind:this={audioEl}
    src={url}
    preload="metadata"
    onloadedmetadata={metadonneesChargees}
    ontimeupdate={miseAJourTemps}
  >
    <track kind="captions" />
  </audio>

  <div class="controles">
    <button
      type="button"
      class="bouton-lecture"
      onclick={basculerLecture}
      aria-label={enLecture ? 'Mettre en pause' : "Écouter l'extrait"}
    >
      {enLecture ? '⏸' : '▶'}
    </button>
    <span class="temps">
      {formaterTemps(Math.max(0, tempsActuel - debut))} / {formaterTemps(
        Math.max(0, finEffective - debut),
      )}
    </span>
  </div>

  <div class="piste" bind:this={pisteEl}>
    <div
      class="plage-selectionnee"
      style={`left: ${pct(debut)}%; width: ${Math.max(0, pct(finEffective) - pct(debut))}%`}
    ></div>
    {#if enLecture}
      <div class="tete-lecture" style={`left: ${pct(tempsActuel)}%`}></div>
    {/if}
    {#if modifiable}
      <div
        class="poignee poignee-debut"
        style={`left: ${pct(debut)}%`}
        onpointerdown={(e) => commencerGlissement(e, 'debut')}
        onkeydown={(e) => clavierGlissement(e, 'debut')}
        role="slider"
        aria-label="Début de l'extrait"
        aria-valuemin={0}
        aria-valuemax={duree}
        aria-valuenow={debut}
        tabindex="0"
      ></div>
      <div
        class="poignee poignee-fin"
        style={`left: ${pct(finEffective)}%`}
        onpointerdown={(e) => commencerGlissement(e, 'fin')}
        onkeydown={(e) => clavierGlissement(e, 'fin')}
        role="slider"
        aria-label="Fin de l'extrait"
        aria-valuemin={0}
        aria-valuemax={duree}
        aria-valuenow={finEffective}
        tabindex="0"
      ></div>
    {/if}
  </div>
</div>

<style>
  .extrait-audio {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  audio {
    display: none;
  }
  .controles {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .bouton-lecture {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: #fff;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .temps {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .piste {
    position: relative;
    height: 0.9rem;
    background-color: var(--border);
    border-radius: 999px;
  }
  .plage-selectionnee {
    position: absolute;
    top: 0;
    bottom: 0;
    background-color: var(--accent);
    opacity: 0.35;
    border-radius: 999px;
  }
  .tete-lecture {
    position: absolute;
    top: -0.15rem;
    bottom: -0.15rem;
    width: 2px;
    background-color: var(--text-h);
    transform: translateX(-1px);
  }
  .poignee {
    position: absolute;
    top: 50%;
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 999px;
    background-color: var(--accent);
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px var(--accent);
    transform: translate(-50%, -50%);
    cursor: ew-resize;
    touch-action: none;
  }
  .poignee:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
