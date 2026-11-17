<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import {
    extraireIdDossier,
    listerFichiersDossier,
    telechargerFichierDrive,
    type FichierDrive,
  } from '../lib/drive/driveFichiers';

  let {
    typeMime,
    onimporter,
  }: {
    typeMime: 'audio' | 'image';
    onimporter: (fichier: {
      nom: string;
      mime: string;
      blob: Blob;
      idDrive: string;
      dossier?: string;
    }) => void;
  } = $props();

  const cleApiConfiguree = Boolean(import.meta.env.VITE_GOOGLE_API_KEY);

  let lien = $state('');
  let fichiers = $state<FichierDrive[]>([]);
  let chargement = $state(false);
  let erreur = $state('');
  const idsEnCours = new SvelteSet<string>();
  const idsImportes = new SvelteSet<string>();

  async function lister(evenement: SubmitEvent) {
    evenement.preventDefault();
    erreur = '';
    fichiers = [];
    const idDossier = extraireIdDossier(lien);
    if (!idDossier) {
      erreur = 'Lien de dossier Google Drive non reconnu.';
      return;
    }
    chargement = true;
    try {
      fichiers = await listerFichiersDossier(idDossier, typeMime);
      if (fichiers.length === 0) {
        erreur =
          'Aucun fichier trouvé. Vérifiez que le dossier est bien partagé « Tous les utilisateurs disposant du lien ».';
      }
    } catch (e) {
      erreur = e instanceof Error ? e.message : 'Impossible de lire ce dossier.';
    } finally {
      chargement = false;
    }
  }

  async function importer(fichier: FichierDrive) {
    idsEnCours.add(fichier.id);
    try {
      const blob = await telechargerFichierDrive(fichier.id);
      onimporter({
        nom: fichier.nom,
        mime: fichier.mimeType,
        blob,
        idDrive: fichier.id,
        dossier: fichier.dossier,
      });
      idsImportes.add(fichier.id);
    } catch (e) {
      erreur = `Échec du téléchargement de « ${fichier.nom} » : ${e instanceof Error ? e.message : 'erreur inconnue.'}`;
    } finally {
      idsEnCours.delete(fichier.id);
    }
  }
</script>

<div class="importer-drive">
  {#if !cleApiConfiguree}
    <p class="aide">
      Non configuré : ajoutez <code>VITE_GOOGLE_API_KEY</code> dans <code>.env.local</code> (voir
      <code>docs/GOOGLE_SETUP.md</code>) pour importer depuis un dossier Google Drive partagé par
      lien.
    </p>
  {:else}
    <form onsubmit={lister}>
      <input
        type="text"
        bind:value={lien}
        placeholder="Lien du dossier Drive partagé (« Tous les utilisateurs disposant du lien »)"
      />
      <button type="submit" disabled={chargement || !lien.trim()}>
        {chargement ? 'Recherche…' : 'Lister les fichiers'}
      </button>
    </form>

    {#if erreur}
      <p class="erreur">{erreur}</p>
    {/if}

    {#if fichiers.length > 0}
      <ul class="liste-fichiers">
        {#each fichiers as fichier (fichier.id)}
          <li>
            <span class="nom-fichier">
              {#if fichier.dossier}<span class="dossier-fichier">{fichier.dossier}/</span
                >{/if}{fichier.nom}
            </span>
            {#if idsImportes.has(fichier.id)}
              <span class="statut-importe">Importé</span>
            {:else}
              <button
                type="button"
                disabled={idsEnCours.has(fichier.id)}
                onclick={() => importer(fichier)}
              >
                {idsEnCours.has(fichier.id) ? 'Import…' : 'Importer'}
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .importer-drive {
    text-align: left;
  }
  form {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  input[type='text'] {
    flex: 1;
    min-width: 14rem;
    padding: 0.45rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    font-size: 0.9rem;
  }
  button {
    padding: 0.45rem 0.9rem;
    border-radius: 0.4rem;
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: #fff;
    cursor: pointer;
    font-size: 0.9rem;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .erreur {
    margin-top: 0.75rem;
    color: #b91c1c;
    font-size: 0.85rem;
  }
  .aide {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .liste-fichiers {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 14rem;
    overflow-y: auto;
  }
  .liste-fichiers li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.4rem;
  }
  .nom-fichier {
    font-size: 0.85rem;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dossier-fichier {
    color: var(--text-muted);
  }
  .liste-fichiers button {
    padding: 0.3rem 0.65rem;
    font-size: 0.8rem;
  }
  .statut-importe {
    color: #15803d;
    font-size: 0.8rem;
    font-weight: 600;
  }
</style>
