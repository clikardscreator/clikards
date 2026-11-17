<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import {
    anneeScolaireActuelle,
    compterElevesParClasse,
    creerClasse,
    listerClasses,
    supprimerClasse,
  } from '../lib/db/classes';
  import { NIVEAUX, type Classe, type Niveau } from '../lib/db/database';

  let classes = $state<Classe[]>([]);
  let effectifs = $state<Record<string, number>>({});
  let chargement = $state(true);
  let erreur = $state('');

  let formulaireOuvert = $state(false);
  let nom = $state('');
  let niveau = $state<Niveau>('6e');
  let anneeScolaire = $state(anneeScolaireActuelle());

  async function recharger() {
    chargement = true;
    erreur = '';
    try {
      const [listeClasses, listeEffectifs] = await Promise.all([
        listerClasses(),
        compterElevesParClasse(),
      ]);
      classes = listeClasses;
      effectifs = listeEffectifs;
    } catch {
      erreur = 'Impossible de charger les classes.';
    } finally {
      chargement = false;
    }
  }

  onMount(recharger);

  async function validerFormulaire(evenement: SubmitEvent) {
    evenement.preventDefault();
    if (!nom.trim()) return;
    await creerClasse({ nom, niveau, anneeScolaire });
    nom = '';
    niveau = '6e';
    anneeScolaire = anneeScolaireActuelle();
    formulaireOuvert = false;
    await recharger();
  }

  async function supprimer(classe: Classe) {
    const confirmation = confirm(
      `Supprimer la classe « ${classe.nom} » et tous ses élèves ? Cette action est irréversible.`,
    );
    if (!confirmation) return;
    await supprimerClasse(classe.id);
    await recharger();
  }
</script>

<section class="page-classes">
  <div class="entete">
    <h1>Classes</h1>
    <button
      type="button"
      class="bouton-principal"
      onclick={() => (formulaireOuvert = !formulaireOuvert)}
    >
      {formulaireOuvert ? 'Annuler' : 'Nouvelle classe'}
    </button>
  </div>

  {#if formulaireOuvert}
    <form class="formulaire" onsubmit={validerFormulaire}>
      <label>
        Nom
        <input type="text" bind:value={nom} placeholder="ex. 6e A" required />
      </label>
      <label>
        Niveau
        <select bind:value={niveau}>
          {#each NIVEAUX as unNiveau (unNiveau)}
            <option value={unNiveau}>{unNiveau}</option>
          {/each}
        </select>
      </label>
      <label>
        Année scolaire
        <input type="text" bind:value={anneeScolaire} placeholder="2026-2027" required />
      </label>
      <button type="submit" class="bouton-principal">Créer</button>
    </form>
  {/if}

  {#if erreur}
    <p class="erreur">{erreur}</p>
  {/if}

  {#if chargement}
    <p class="aide">Chargement…</p>
  {:else if classes.length === 0}
    <p class="aide">Aucune classe pour l'instant. Créez-en une pour commencer.</p>
  {:else}
    <ul class="liste-classes">
      {#each classes as classe (classe.id)}
        <li>
          <a href={`/classes/${classe.id}`} use:link class="carte-classe">
            <span class="nom-classe">{classe.nom}</span>
            <span class="details-classe">
              {classe.niveau} · {classe.anneeScolaire} · {effectifs[classe.id] ?? 0} élève{(effectifs[
                classe.id
              ] ?? 0) > 1
                ? 's'
                : ''}
            </span>
          </a>
          <button
            type="button"
            class="bouton-supprimer"
            onclick={() => supprimer(classe)}
            aria-label={`Supprimer ${classe.nom}`}
          >
            Supprimer
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .page-classes {
    max-width: 40rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem;
  }
  .entete {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .entete h1 {
    margin: 0;
  }
  .bouton-principal {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: #fff;
    cursor: pointer;
    font-size: 0.95rem;
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
  .liste-classes {
    list-style: none;
    margin: 1.5rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .liste-classes li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.4rem 0.4rem 0.4rem 0;
  }
  .carte-classe {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: inherit;
  }
  .nom-classe {
    font-weight: 600;
    color: var(--text-h);
  }
  .details-classe {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .bouton-supprimer {
    padding: 0.4rem 0.75rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    color: #b91c1c;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .bouton-supprimer:hover {
    background-color: #fef2f2;
  }
</style>
