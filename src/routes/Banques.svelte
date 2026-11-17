<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import {
    compterQuestionsParBanque,
    creerBanque,
    dupliquerBanque,
    listerBanques,
    supprimerBanque,
  } from '../lib/db/banques';
  import { analyserExportBanque, importerBanque } from '../lib/db/banqueExport';
  import { NIVEAUX, type Banque, type Niveau } from '../lib/db/database';

  let banques = $state<Banque[]>([]);
  let effectifs = $state<Record<string, number>>({});
  let chargement = $state(true);
  let erreur = $state('');

  let formulaireOuvert = $state(false);
  let titre = $state('');
  let niveau = $state<Niveau | ''>('');

  let entreeFichier: HTMLInputElement | undefined = $state();
  let erreurImport = $state('');

  async function recharger() {
    chargement = true;
    erreur = '';
    try {
      const [listeBanques, listeEffectifs] = await Promise.all([
        listerBanques(),
        compterQuestionsParBanque(),
      ]);
      banques = listeBanques;
      effectifs = listeEffectifs;
    } catch {
      erreur = 'Impossible de charger les banques.';
    } finally {
      chargement = false;
    }
  }

  onMount(recharger);

  async function validerFormulaire(evenement: SubmitEvent) {
    evenement.preventDefault();
    if (!titre.trim()) return;
    await creerBanque({ titre, niveau: niveau || undefined });
    titre = '';
    niveau = '';
    formulaireOuvert = false;
    await recharger();
  }

  async function supprimer(banque: Banque) {
    const confirmation = confirm(
      `Supprimer la banque « ${banque.titre} » et toutes ses questions ? Cette action est irréversible.`,
    );
    if (!confirmation) return;
    await supprimerBanque(banque.id);
    await recharger();
  }

  async function dupliquer(banque: Banque) {
    await dupliquerBanque(banque.id);
    await recharger();
  }

  async function importerDepuisFichier(evenement: Event) {
    erreurImport = '';
    const fichier = (evenement.currentTarget as HTMLInputElement).files?.[0];
    if (!fichier) return;

    try {
      const texte = await fichier.text();
      const exportBanque = analyserExportBanque(JSON.parse(texte));
      await importerBanque(exportBanque);
      await recharger();
    } catch (e) {
      erreurImport = e instanceof Error ? e.message : 'Fichier invalide.';
    } finally {
      if (entreeFichier) entreeFichier.value = '';
    }
  }
</script>

<section class="page-banques">
  <div class="entete">
    <h1>Bibliothèque de questions</h1>
    <div class="actions-entete">
      <label class="bouton-fichier">
        Importer une banque (JSON)
        <input
          bind:this={entreeFichier}
          type="file"
          accept="application/json"
          onchange={importerDepuisFichier}
        />
      </label>
      <button
        type="button"
        class="bouton-principal"
        onclick={() => (formulaireOuvert = !formulaireOuvert)}
      >
        {formulaireOuvert ? 'Annuler' : 'Nouvelle banque'}
      </button>
    </div>
  </div>

  {#if formulaireOuvert}
    <form class="formulaire" onsubmit={validerFormulaire}>
      <label>
        Titre
        <input type="text" bind:value={titre} placeholder="ex. Timbres — 6e" required />
      </label>
      <label>
        Niveau (optionnel)
        <select bind:value={niveau}>
          <option value="">—</option>
          {#each NIVEAUX as unNiveau (unNiveau)}
            <option value={unNiveau}>{unNiveau}</option>
          {/each}
        </select>
      </label>
      <button type="submit" class="bouton-principal">Créer</button>
    </form>
  {/if}

  {#if erreur}
    <p class="erreur">{erreur}</p>
  {/if}
  {#if erreurImport}
    <p class="erreur">{erreurImport}</p>
  {/if}

  {#if chargement}
    <p class="aide">Chargement…</p>
  {:else if banques.length === 0}
    <p class="aide">Aucune banque pour l'instant. Créez-en une ou importez-en une.</p>
  {:else}
    <ul class="liste-banques">
      {#each banques as banque (banque.id)}
        <li>
          <a href={`/banques/${banque.id}`} use:link class="carte-banque">
            <span class="titre-banque">{banque.titre}</span>
            <span class="details-banque">
              {#if banque.niveau}{banque.niveau} ·
              {/if}{effectifs[banque.id] ?? 0} question{(effectifs[banque.id] ?? 0) > 1 ? 's' : ''}
            </span>
          </a>
          <div class="actions-ligne">
            <button type="button" onclick={() => dupliquer(banque)}>Dupliquer</button>
            <button
              type="button"
              class="bouton-supprimer"
              onclick={() => supprimer(banque)}
              aria-label={`Supprimer ${banque.titre}`}
            >
              Supprimer
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .page-banques {
    max-width: 44rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem;
  }
  .entete {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .entete h1 {
    margin: 0;
  }
  .actions-entete {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .bouton-principal,
  .bouton-fichier {
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
  .formulaire {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: end;
    margin-top: 1.25rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background-color: #f8fafc;
  }
  .formulaire label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: var(--text);
  }
  .formulaire input,
  .formulaire select {
    padding: 0.45rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    font-size: 0.95rem;
  }
  .erreur {
    margin-top: 1rem;
    color: #b91c1c;
  }
  .aide {
    margin-top: 1.5rem;
    color: var(--text-muted);
  }
  .liste-banques {
    list-style: none;
    margin: 1.5rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .liste-banques li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.4rem 0.4rem 0.4rem 0;
  }
  .carte-banque {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: inherit;
  }
  .titre-banque {
    font-weight: 600;
    color: var(--text-h);
  }
  .details-banque {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .actions-ligne {
    display: flex;
    gap: 0.4rem;
    padding-right: 0.5rem;
  }
  .actions-ligne button {
    padding: 0.4rem 0.75rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text);
  }
  .actions-ligne button:hover {
    background-color: var(--accent-bg);
  }
  .bouton-supprimer {
    color: #b91c1c !important;
  }
  .bouton-supprimer:hover {
    background-color: #fef2f2 !important;
  }
</style>
