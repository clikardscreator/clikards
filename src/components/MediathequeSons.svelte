<script lang="ts">
  import { onMount } from 'svelte';
  import {
    formaterTailleOctets,
    importerSonDepuisDrive,
    importerSonLocal,
    listerSons,
    supprimerSon,
    tailleTotaleCacheSons,
    viderCacheSons,
  } from '../lib/db/sons';
  import type { Son } from '../lib/db/database';
  import ImporterDepuisDrive from './ImporterDepuisDrive.svelte';
  import LecteurAudio from './LecteurAudio.svelte';

  let sons = $state<Son[]>([]);
  let chargement = $state(true);
  let tailleCache = $state(0);
  let driveOuvert = $state(false);
  let entreeFichiers: HTMLInputElement | undefined = $state();

  async function recharger() {
    chargement = true;
    const [listeSons, taille] = await Promise.all([listerSons(), tailleTotaleCacheSons()]);
    sons = listeSons;
    tailleCache = taille;
    chargement = false;
  }

  onMount(recharger);

  async function importerFichiers(evenement: Event) {
    const fichiers = (evenement.currentTarget as HTMLInputElement).files;
    if (!fichiers || fichiers.length === 0) return;
    for (const fichier of Array.from(fichiers)) {
      await importerSonLocal(fichier);
    }
    if (entreeFichiers) entreeFichiers.value = '';
    await recharger();
  }

  async function importerDepuisDrive(fichier: {
    nom: string;
    mime: string;
    blob: Blob;
    idDrive: string;
  }) {
    await importerSonDepuisDrive(fichier);
    await recharger();
  }

  async function supprimer(son: Son) {
    const confirmation = confirm(`Supprimer « ${son.titre} » de la médiathèque ?`);
    if (!confirmation) return;
    await supprimerSon(son.id);
    await recharger();
  }

  async function viderCache() {
    const confirmation = confirm(
      'Vider toute la médiathèque de sons ? Les questions qui utilisaient ces sons perdront leur extrait audio.',
    );
    if (!confirmation) return;
    await viderCacheSons();
    await recharger();
  }
</script>

<div class="mediatheque-sons">
  <div class="actions">
    <label class="bouton-fichier">
      Importer depuis mon ordinateur
      <input
        bind:this={entreeFichiers}
        type="file"
        accept="audio/*"
        multiple
        onchange={importerFichiers}
      />
    </label>
    <button type="button" onclick={() => (driveOuvert = !driveOuvert)}>
      {driveOuvert ? 'Fermer' : 'Importer depuis Google Drive'}
    </button>
  </div>

  {#if driveOuvert}
    <div class="bloc-drive">
      <ImporterDepuisDrive typeMime="audio" onimporter={importerDepuisDrive} />
    </div>
  {/if}

  {#if chargement}
    <p class="aide">Chargement…</p>
  {:else if sons.length === 0}
    <p class="aide">Aucun son importé pour l'instant.</p>
  {:else}
    <p class="aide-cache">
      Espace utilisé : {formaterTailleOctets(tailleCache)} ·
      <button type="button" class="lien" onclick={viderCache}>vider le cache</button>
    </p>
    <ul class="liste-sons">
      {#each sons as son (son.id)}
        <li>
          <div class="infos-son">
            <p class="titre-son">{son.titre}</p>
            <p class="meta-son">
              {formaterTailleOctets(son.blob.size)}
              {#if son.sourceDriveId}· importé depuis Google Drive{/if}
            </p>
          </div>
          <LecteurAudio blob={son.blob} />
          <button
            type="button"
            class="bouton-supprimer"
            onclick={() => supprimer(son)}
            aria-label={`Supprimer ${son.titre}`}
          >
            Supprimer
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .mediatheque-sons {
    text-align: left;
    max-width: 44rem;
    margin: 0 auto;
  }
  .actions {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .bouton-fichier,
  .actions button {
    position: relative;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: #fff;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .bouton-fichier input[type='file'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  .bloc-drive {
    margin-top: 1.25rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background-color: #f8fafc;
  }
  .aide {
    margin-top: 1.5rem;
    color: var(--text-muted);
    text-align: center;
  }
  .aide-cache {
    margin-top: 1.25rem;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-align: center;
  }
  .lien {
    border: none;
    background: none;
    color: var(--accent);
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.85rem;
    padding: 0;
  }
  .liste-sons {
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .liste-sons li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.6rem 0.75rem;
  }
  .infos-son {
    flex: 1 1 10rem;
    min-width: 0;
  }
  .titre-son {
    font-weight: 500;
    color: var(--text-h);
  }
  .meta-son {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .bouton-supprimer {
    padding: 0.35rem 0.65rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
    font-size: 0.8rem;
    color: #b91c1c;
  }
</style>
