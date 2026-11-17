<script lang="ts">
  import { onMount } from 'svelte';
  import {
    analyserSauvegarde,
    exporterSauvegarde,
    nomFichierSauvegarde,
    restaurerSauvegarde,
  } from '../lib/db/sauvegarde';
  import {
    activerSauvegardeAuto,
    desactiverSauvegardeAuto,
    etatSauvegardeAuto,
    initialiserSauvegardeAuto,
    reactiverSauvegardeAuto,
    signalerChangementDonnees,
    supporteSauvegardeAuto,
  } from '../lib/db/sauvegardeAuto';

  let messageManuel = $state('');
  let erreurManuelle = $state('');
  let entreeFichier: HTMLInputElement | undefined = $state();

  onMount(() => {
    void initialiserSauvegardeAuto();
  });

  async function telechargerSauvegarde() {
    const sauvegarde = await exporterSauvegarde();
    const blob = new Blob([JSON.stringify(sauvegarde, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichierSauvegarde();
    lien.click();
    URL.revokeObjectURL(url);
  }

  async function restaurerDepuisFichier(evenement: Event) {
    erreurManuelle = '';
    messageManuel = '';
    const fichier = (evenement.currentTarget as HTMLInputElement).files?.[0];
    if (!fichier) return;

    try {
      const texte = await fichier.text();
      const sauvegarde = analyserSauvegarde(JSON.parse(texte));
      const confirmation = confirm(
        `Restaurer cette sauvegarde (${sauvegarde.classes.length} classe(s), ${sauvegarde.eleves.length} élève(s)) ? Les données actuelles seront remplacées.`,
      );
      if (!confirmation) return;
      await restaurerSauvegarde(sauvegarde);
      signalerChangementDonnees();
      messageManuel = 'Sauvegarde restaurée.';
    } catch (e) {
      erreurManuelle = e instanceof Error ? e.message : 'Fichier invalide.';
    } finally {
      if (entreeFichier) entreeFichier.value = '';
    }
  }

  async function activer() {
    try {
      await activerSauvegardeAuto();
    } catch (e) {
      etatSauvegardeAuto.update((etat) => ({
        ...etat,
        erreur: e instanceof Error ? e.message : 'Action annulée.',
      }));
    }
  }

  async function desactiver() {
    await desactiverSauvegardeAuto();
  }

  async function reactiver() {
    await reactiverSauvegardeAuto();
  }
</script>

<section class="page-reglages">
  <h1>Réglages</h1>

  <div class="bloc">
    <h2>Sauvegarde</h2>
    <p class="aide">
      Les données restent uniquement sur cet appareil, dans ce navigateur. Téléchargez régulièrement
      une sauvegarde pour ne rien perdre en cas de changement d'ordinateur ou de suppression
      accidentelle.
    </p>

    <div class="actions">
      <button type="button" onclick={telechargerSauvegarde}>Télécharger une sauvegarde</button>
      <label class="bouton-fichier">
        Restaurer une sauvegarde
        <input
          bind:this={entreeFichier}
          type="file"
          accept="application/json"
          onchange={restaurerDepuisFichier}
        />
      </label>
    </div>
    {#if messageManuel}
      <p class="confirmation">{messageManuel}</p>
    {/if}
    {#if erreurManuelle}
      <p class="erreur">{erreurManuelle}</p>
    {/if}
  </div>

  <div class="bloc">
    <h2>Sauvegarde automatique</h2>

    {#if !supporteSauvegardeAuto}
      <p class="aide">
        Pas disponible dans ce navigateur (nécessite Chrome, Edge ou un autre navigateur basé sur
        Chromium). Utilisez le téléchargement manuel ci-dessus.
      </p>
    {:else if !$etatSauvegardeAuto.configuree}
      <p class="aide">
        Choisissez un fichier .json qui sera mis à jour automatiquement quelques secondes après
        chaque modification. Astuce : en le plaçant dans un dossier synchronisé par l'application
        Google Drive sur votre ordinateur, votre sauvegarde se retrouve automatiquement dans votre
        Drive — sans connexion ni compte à configurer ici.
      </p>
      <button type="button" onclick={activer}>Activer la sauvegarde automatique</button>
    {:else if $etatSauvegardeAuto.active}
      <p class="confirmation">
        Active → <strong>{$etatSauvegardeAuto.nomFichier}</strong>
        {#if $etatSauvegardeAuto.dernierEnregistrement}
          · dernier enregistrement à {$etatSauvegardeAuto.dernierEnregistrement.toLocaleTimeString(
            'fr-FR',
          )}
        {/if}
      </p>
      <button type="button" onclick={desactiver}>Désactiver</button>
    {:else}
      <p class="aide">
        Configurée vers <strong>{$etatSauvegardeAuto.nomFichier}</strong>, mais l'autorisation
        d'écriture doit être confirmée pour cette session (le navigateur ne la retient pas d'une
        visite à l'autre).
      </p>
      <button type="button" onclick={reactiver}>Réactiver</button>
    {/if}

    {#if $etatSauvegardeAuto.erreur}
      <p class="erreur">{$etatSauvegardeAuto.erreur}</p>
    {/if}
  </div>
</section>

<style>
  .page-reglages {
    max-width: 36rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem;
  }
  .bloc {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }
  .bloc:first-of-type {
    margin-top: 1.5rem;
    padding-top: 0;
    border-top: none;
  }
  h2 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  .aide {
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  button,
  .bouton-fichier {
    position: relative;
    display: inline-flex;
    align-items: center;
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
  .confirmation {
    margin-top: 0.75rem;
    color: #15803d;
    font-size: 0.9rem;
  }
  .erreur {
    margin-top: 0.75rem;
    color: #b91c1c;
    font-size: 0.9rem;
  }
</style>
