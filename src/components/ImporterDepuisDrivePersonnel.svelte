<script lang="ts">
  import { onMount } from 'svelte';
  import { chargerGoogleIdentityServices } from '../lib/auth/google';
  import {
    demanderJetonDrive,
    ouvrirSelecteurDrive,
    telechargerFichierAvecJeton,
  } from '../lib/drive/drivePersonnel';

  let {
    typeMime,
    onimporter,
  }: {
    typeMime: 'audio' | 'image';
    onimporter: (fichier: { nom: string; mime: string; blob: Blob; idDrive: string }) => void;
  } = $props();

  const clientIdConfigure = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  let chargement = $state(false);
  let erreur = $state('');
  let messageProgression = $state('');

  onMount(() => {
    // Précharger dès l'affichage (pas au clic) : sinon le chargement du
    // script retarde l'appel à requestAccessToken() après le geste de clic,
    // et le navigateur peut alors bloquer la fenêtre de consentement Google
    // en la considérant comme un popup non sollicité par l'utilisateur.
    if (clientIdConfigure) {
      chargerGoogleIdentityServices().catch(() => {
        // Erreur silencieuse ici : elle sera signalée au clic si le script
        // n'a toujours pas pu se charger.
      });
    }
  });

  async function choisirDepuisMonDrive() {
    erreur = '';
    messageProgression = '';
    chargement = true;
    try {
      const jeton = await demanderJetonDrive();
      const fichiersChoisis = await ouvrirSelecteurDrive(jeton, typeMime);

      for (const [index, fichier] of fichiersChoisis.entries()) {
        messageProgression = `Import ${index + 1}/${fichiersChoisis.length} : ${fichier.nom}…`;
        const blob = await telechargerFichierAvecJeton(fichier.id, jeton);
        onimporter({ nom: fichier.nom, mime: fichier.mimeType, blob, idDrive: fichier.id });
      }

      messageProgression =
        fichiersChoisis.length > 0
          ? `${fichiersChoisis.length} fichier${fichiersChoisis.length > 1 ? 's' : ''} importé${fichiersChoisis.length > 1 ? 's' : ''}.`
          : '';
    } catch (e) {
      erreur = e instanceof Error ? e.message : 'Échec de la sélection depuis Google Drive.';
    } finally {
      chargement = false;
    }
  }
</script>

<div class="importer-drive-personnel">
  {#if !clientIdConfigure}
    <p class="aide">
      Non configuré : ajoutez <code>VITE_GOOGLE_CLIENT_ID</code> dans <code>.env.local</code> (voir
      <code>docs/GOOGLE_SETUP.md</code>) pour choisir directement un fichier dans votre Drive
      personnel.
    </p>
  {:else}
    <button type="button" onclick={choisirDepuisMonDrive} disabled={chargement}>
      {chargement ? 'Ouverture…' : 'Choisir dans mon Drive'}
    </button>
    <p class="aide">
      Vous choisirez le ou les fichiers dans le sélecteur Google officiel ; Clikards n'a accès qu'à
      ce que vous sélectionnez.
    </p>
    {#if messageProgression}
      <p class="confirmation">{messageProgression}</p>
    {/if}
    {#if erreur}
      <p class="erreur">{erreur}</p>
    {/if}
  {/if}
</div>

<style>
  .importer-drive-personnel {
    text-align: left;
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
  .aide {
    margin-top: 0.5rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .confirmation {
    margin-top: 0.5rem;
    color: #15803d;
    font-size: 0.85rem;
  }
  .erreur {
    margin-top: 0.5rem;
    color: #b91c1c;
    font-size: 0.85rem;
  }
</style>
