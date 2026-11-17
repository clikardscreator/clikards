<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { obtenirClasse } from '../lib/db/classes';
  import {
    ajouterEleve,
    importerElevesDepuisTexte,
    listerElevesParClasse,
    modifierNumeroCarte,
    supprimerEleve,
  } from '../lib/db/eleves';
  import { NUMERO_CARTE_MAX, type Classe, type Eleve } from '../lib/db/database';

  let { params }: { params: { id: string } } = $props();

  let classe = $state<Classe | null | undefined>(undefined);
  let eleves = $state<Eleve[]>([]);
  let chargement = $state(true);

  let nomNouvel = $state('');
  let prenomNouvel = $state('');
  let erreurAjout = $state('');

  let texteImport = $state('');
  let messageImport = $state('');
  let erreurImport = $state('');

  let erreursNumero = $state<Record<string, string>>({});

  async function recharger() {
    chargement = true;
    const [classeChargee, elevesCharges] = await Promise.all([
      obtenirClasse(params.id),
      listerElevesParClasse(params.id),
    ]);
    classe = classeChargee ?? null;
    eleves = elevesCharges;
    chargement = false;
  }

  onMount(recharger);

  async function validerAjout(evenement: SubmitEvent) {
    evenement.preventDefault();
    erreurAjout = '';
    if (!nomNouvel.trim()) return;
    try {
      await ajouterEleve({ classeId: params.id, nom: nomNouvel, prenom: prenomNouvel });
      nomNouvel = '';
      prenomNouvel = '';
      await recharger();
    } catch (e) {
      erreurAjout = e instanceof Error ? e.message : "Impossible d'ajouter l'élève.";
    }
  }

  async function lancerImport(evenement: SubmitEvent) {
    evenement.preventDefault();
    erreurImport = '';
    messageImport = '';
    if (!texteImport.trim()) return;
    try {
      const resultat = await importerElevesDepuisTexte(params.id, texteImport);
      messageImport = `${resultat.importes} élève${resultat.importes > 1 ? 's' : ''} importé${resultat.importes > 1 ? 's' : ''}.`;
      if (resultat.ignores > 0) {
        messageImport += ` ${resultat.ignores} ignoré${resultat.ignores > 1 ? 's' : ''} (limite de ${NUMERO_CARTE_MAX} cartes atteinte).`;
      }
      texteImport = '';
      await recharger();
    } catch (e) {
      erreurImport = e instanceof Error ? e.message : "Échec de l'import.";
    }
  }

  async function supprimer(eleve: Eleve) {
    const confirmation = confirm(`Retirer ${eleve.prenom} ${eleve.nom} de la classe ?`);
    if (!confirmation) return;
    await supprimerEleve(eleve.id);
    await recharger();
  }

  async function changerNumero(eleve: Eleve, evenement: Event) {
    const valeur = Number((evenement.currentTarget as HTMLInputElement).value);
    try {
      await modifierNumeroCarte(eleve.id, valeur);
      erreursNumero = { ...erreursNumero, [eleve.id]: '' };
    } catch (e) {
      erreursNumero = {
        ...erreursNumero,
        [eleve.id]: e instanceof Error ? e.message : 'Numéro invalide.',
      };
    }
    await recharger();
  }
</script>

<section class="detail-classe">
  <a href="/classes" use:link class="retour">← Retour aux classes</a>

  {#if chargement}
    <p class="aide">Chargement…</p>
  {:else if classe === null}
    <p class="erreur">Classe introuvable.</p>
  {:else if classe}
    <h1>{classe.nom}</h1>
    <p class="sous-titre">
      {classe.niveau} · {classe.anneeScolaire} · {eleves.length} élève{eleves.length > 1 ? 's' : ''}
    </p>

    <div class="colonnes">
      <div class="colonne">
        <h2>Élèves</h2>
        {#if eleves.length === 0}
          <p class="aide">Aucun élève. Ajoutez-les un par un ou importez une liste.</p>
        {:else}
          <ul class="liste-eleves">
            {#each eleves as eleve (eleve.id)}
              <li>
                <div class="ligne-eleve">
                  <input
                    type="number"
                    min="1"
                    max={NUMERO_CARTE_MAX}
                    value={eleve.numeroCarte}
                    class="numero"
                    onchange={(e) => changerNumero(eleve, e)}
                    aria-label={`Numéro de carte de ${eleve.prenom} ${eleve.nom}`}
                  />
                  <span class="nom-eleve">{eleve.nom} {eleve.prenom}</span>
                  <button
                    type="button"
                    class="bouton-retirer"
                    onclick={() => supprimer(eleve)}
                    aria-label={`Retirer ${eleve.nom} ${eleve.prenom}`}
                  >
                    ✕
                  </button>
                </div>
                {#if erreursNumero[eleve.id]}
                  <p class="erreur-ligne">{erreursNumero[eleve.id]}</p>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        <form class="formulaire-ajout" onsubmit={validerAjout}>
          <input type="text" bind:value={nomNouvel} placeholder="Nom" required />
          <input type="text" bind:value={prenomNouvel} placeholder="Prénom" />
          <button type="submit">Ajouter</button>
        </form>
        {#if erreurAjout}
          <p class="erreur">{erreurAjout}</p>
        {/if}
      </div>

      <div class="colonne">
        <h2>Import rapide</h2>
        <p class="aide">
          Collez une liste copiée depuis Pronote (une ligne par élève, « NOM Prénom »). Les numéros
          de carte sont attribués automatiquement.
        </p>
        <form onsubmit={lancerImport}>
          <textarea
            bind:value={texteImport}
            rows="8"
            placeholder="MARTIN Lucas&#10;DUPONT Marie Claire&#10;…"></textarea>
          <button type="submit" disabled={!texteImport.trim()}>Importer</button>
        </form>
        {#if messageImport}
          <p class="confirmation">{messageImport}</p>
        {/if}
        {#if erreurImport}
          <p class="erreur">{erreurImport}</p>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .detail-classe {
    max-width: 56rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem;
  }
  .retour {
    color: var(--accent);
    text-decoration: none;
    font-size: 0.9rem;
  }
  h1 {
    margin: 1rem 0 0.25rem;
  }
  .sous-titre {
    color: var(--text-muted);
    margin-bottom: 1.5rem;
  }
  .colonnes {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .colonne {
    flex: 1 1 18rem;
    min-width: 16rem;
  }
  .colonne h2 {
    font-size: 1.05rem;
    margin-bottom: 0.75rem;
  }
  .liste-eleves {
    list-style: none;
    margin: 0 0 1.25rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .ligne-eleve {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    padding: 0.4rem 0.6rem;
  }
  .numero {
    width: 3.2rem;
    padding: 0.25rem 0.4rem;
    border-radius: 0.3rem;
    border: 1px solid var(--border);
    text-align: center;
  }
  .nom-eleve {
    flex: 1;
    color: var(--text-h);
  }
  .bouton-retirer {
    border: none;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.95rem;
    padding: 0.2rem 0.4rem;
  }
  .bouton-retirer:hover {
    color: #b91c1c;
  }
  .erreur-ligne {
    color: #b91c1c;
    font-size: 0.8rem;
    margin: 0.2rem 0 0 0.6rem;
  }
  .formulaire-ajout {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .formulaire-ajout input {
    flex: 1;
    min-width: 6rem;
    padding: 0.45rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
  }
  .formulaire-ajout button,
  .colonne form > button {
    padding: 0.45rem 0.9rem;
    border-radius: 0.4rem;
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: #fff;
    cursor: pointer;
  }
  .formulaire-ajout button:disabled,
  .colonne form > button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    font-family: ui-monospace, Consolas, monospace;
    font-size: 0.85rem;
    margin-bottom: 0.6rem;
    resize: vertical;
  }
  .aide {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .erreur {
    color: #b91c1c;
    margin-top: 0.75rem;
  }
  .confirmation {
    color: #15803d;
    margin-top: 0.75rem;
    font-size: 0.9rem;
  }
</style>
