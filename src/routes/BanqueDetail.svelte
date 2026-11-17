<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { obtenirBanque } from '../lib/db/banques';
  import {
    creerQuestion,
    deplacerQuestion,
    modifierQuestion,
    listerQuestionsParBanque,
    supprimerQuestion,
    type DonneesQuestion,
  } from '../lib/db/questions';
  import {
    exporterBanque,
    importerBanque,
    analyserExportBanque,
    nomFichierBanque,
  } from '../lib/db/banqueExport';
  import { questionsVersCsv, csvVersQuestions, nomFichierCsv } from '../lib/db/banqueCsv';
  import type {
    Banque,
    Choix,
    ImageQuestion,
    Lettre,
    Question,
    TypeQuestion,
  } from '../lib/db/database';
  import RechercheImages from '../components/RechercheImages.svelte';
  import type { ImageTrouvee } from '../lib/images/openverse';
  import { texteAttribution } from '../lib/images/openverse';

  let { params }: { params: { id: string } } = $props();

  let banque = $state<Banque | null | undefined>(undefined);
  let questions = $state<Question[]>([]);
  let chargement = $state(true);

  let formulaireOuvert = $state(false);
  let idEnEdition = $state<string | null>(null);
  let enonce = $state('');
  let type = $state<TypeQuestion>('qcm');
  let choixTextes = $state(['', '', '', '']);
  let bonneReponse = $state<Lettre | ''>('');
  let competence = $state('');
  let coefficient = $state(1);
  let notee = $state(true);
  let image = $state<ImageQuestion | undefined>(undefined);
  let selecteurImageOuvert = $state(false);
  let erreurFormulaire = $state('');

  let entreeImportJson: HTMLInputElement | undefined = $state();
  let entreeImportCsv: HTMLInputElement | undefined = $state();
  let messageImport = $state('');
  let erreurImport = $state('');

  const LETTRES: Lettre[] = ['A', 'B', 'C', 'D'];

  async function recharger() {
    chargement = true;
    const [banqueChargee, questionsChargees] = await Promise.all([
      obtenirBanque(params.id),
      listerQuestionsParBanque(params.id),
    ]);
    banque = banqueChargee ?? null;
    questions = questionsChargees;
    chargement = false;
  }

  onMount(recharger);

  function reinitialiserFormulaire() {
    idEnEdition = null;
    enonce = '';
    type = 'qcm';
    choixTextes = ['', '', '', ''];
    bonneReponse = '';
    competence = '';
    coefficient = 1;
    notee = true;
    image = undefined;
    selecteurImageOuvert = false;
    erreurFormulaire = '';
  }

  function ouvrirCreation() {
    reinitialiserFormulaire();
    formulaireOuvert = true;
  }

  function ouvrirEdition(question: Question) {
    idEnEdition = question.id;
    enonce = question.enonce;
    type = question.type;
    choixTextes = ['', '', '', ''];
    question.choix.forEach((c) => {
      const index = LETTRES.indexOf(c.lettre);
      if (index >= 0) choixTextes[index] = c.texte;
    });
    bonneReponse = question.bonneReponse ?? '';
    competence = question.competence ?? '';
    coefficient = question.coefficient;
    notee = question.notee;
    image = question.image;
    selecteurImageOuvert = false;
    erreurFormulaire = '';
    formulaireOuvert = true;
  }

  function changerType(nouveauType: TypeQuestion) {
    type = nouveauType;
    if (nouveauType === 'vraifaux') {
      choixTextes = ['Vrai', 'Faux', '', ''];
    } else if (choixTextes[0] === 'Vrai' && choixTextes[1] === 'Faux') {
      choixTextes = ['', '', '', ''];
    }
    if (nouveauType === 'sondage') {
      bonneReponse = '';
      notee = false;
    } else if (!notee) {
      notee = true;
    }
  }

  function choisirImage(trouvee: ImageTrouvee) {
    image = { url: trouvee.url, attribution: texteAttribution(trouvee) };
    selecteurImageOuvert = false;
  }

  async function validerFormulaire(evenement: SubmitEvent) {
    evenement.preventDefault();
    erreurFormulaire = '';

    const choix: Choix[] = choixTextes
      .map((texte, index) => ({ lettre: LETTRES[index], texte: texte.trim() }))
      .filter((c) => c.texte.length > 0);

    if (!enonce.trim()) {
      erreurFormulaire = "L'énoncé est obligatoire.";
      return;
    }
    if (type !== 'sondage' && choix.length < 2) {
      erreurFormulaire = 'Au moins 2 choix sont nécessaires.';
      return;
    }
    if (type !== 'sondage' && !bonneReponse) {
      erreurFormulaire = 'Choisissez la bonne réponse.';
      return;
    }

    const donnees: DonneesQuestion = {
      enonce,
      type,
      choix,
      bonneReponse: bonneReponse || undefined,
      competence,
      image,
      coefficient,
      notee,
    };

    if (idEnEdition) {
      await modifierQuestion(idEnEdition, donnees);
    } else {
      await creerQuestion(params.id, donnees);
    }

    formulaireOuvert = false;
    reinitialiserFormulaire();
    await recharger();
  }

  async function supprimer(question: Question) {
    const confirmation = confirm('Supprimer cette question ?');
    if (!confirmation) return;
    await supprimerQuestion(question.id);
    await recharger();
  }

  async function deplacer(question: Question, direction: 'haut' | 'bas') {
    await deplacerQuestion(question.id, direction);
    await recharger();
  }

  async function exporterJson() {
    const exportBanque = await exporterBanque(params.id);
    const blob = new Blob([JSON.stringify(exportBanque, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lienTelechargement = document.createElement('a');
    lienTelechargement.href = url;
    lienTelechargement.download = nomFichierBanque(banque?.titre ?? 'banque');
    lienTelechargement.click();
    URL.revokeObjectURL(url);
  }

  function exporterCsv() {
    const csv = questionsVersCsv(questions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lienTelechargement = document.createElement('a');
    lienTelechargement.href = url;
    lienTelechargement.download = nomFichierCsv(banque?.titre ?? 'banque');
    lienTelechargement.click();
    URL.revokeObjectURL(url);
  }

  async function importerJsonCommeNouvelleBanque(evenement: Event) {
    erreurImport = '';
    messageImport = '';
    const fichier = (evenement.currentTarget as HTMLInputElement).files?.[0];
    if (!fichier) return;
    try {
      const texte = await fichier.text();
      const exportBanque = analyserExportBanque(JSON.parse(texte));
      await importerBanque(exportBanque);
      messageImport = `Importé dans une nouvelle banque « ${exportBanque.banque.titre} ».`;
    } catch (e) {
      erreurImport = e instanceof Error ? e.message : 'Fichier invalide.';
    } finally {
      if (entreeImportJson) entreeImportJson.value = '';
    }
  }

  async function importerCsvDansCetteBanque(evenement: Event) {
    erreurImport = '';
    messageImport = '';
    const fichier = (evenement.currentTarget as HTMLInputElement).files?.[0];
    if (!fichier) return;
    try {
      const texte = await fichier.text();
      const lignes = csvVersQuestions(texte);
      for (const ligne of lignes) {
        await creerQuestion(params.id, {
          enonce: ligne.enonce,
          type: 'qcm',
          choix: ligne.choix,
          bonneReponse: ligne.bonneReponse,
          competence: ligne.competence,
          coefficient: ligne.coefficient,
        });
      }
      messageImport = `${lignes.length} question${lignes.length > 1 ? 's' : ''} importée${lignes.length > 1 ? 's' : ''}.`;
      await recharger();
    } catch (e) {
      erreurImport = e instanceof Error ? e.message : 'Fichier invalide.';
    } finally {
      if (entreeImportCsv) entreeImportCsv.value = '';
    }
  }
</script>

<section class="detail-banque">
  <a href="/banques" use:link class="retour">← Retour aux banques</a>

  {#if chargement}
    <p class="aide">Chargement…</p>
  {:else if banque === null}
    <p class="erreur">Banque introuvable.</p>
  {:else if banque}
    <div class="entete">
      <div>
        <h1>{banque.titre}</h1>
        <p class="sous-titre">
          {#if banque.niveau}{banque.niveau} ·
          {/if}{questions.length} question{questions.length > 1 ? 's' : ''}
        </p>
      </div>
      <div class="actions-entete">
        <button type="button" onclick={exporterJson}>Exporter (JSON)</button>
        <button type="button" onclick={exporterCsv}>Exporter (CSV)</button>
        <label class="bouton-fichier">
          Importer QCM (CSV)
          <input
            bind:this={entreeImportCsv}
            type="file"
            accept=".csv,text/csv"
            onchange={importerCsvDansCetteBanque}
          />
        </label>
        <label class="bouton-fichier">
          Importer (JSON, nouvelle banque)
          <input
            bind:this={entreeImportJson}
            type="file"
            accept="application/json"
            onchange={importerJsonCommeNouvelleBanque}
          />
        </label>
      </div>
    </div>

    {#if messageImport}
      <p class="confirmation">{messageImport}</p>
    {/if}
    {#if erreurImport}
      <p class="erreur">{erreurImport}</p>
    {/if}

    {#if !formulaireOuvert}
      <button type="button" class="bouton-principal" onclick={ouvrirCreation}>
        Nouvelle question
      </button>
    {/if}

    {#if formulaireOuvert}
      <form class="formulaire-question" onsubmit={validerFormulaire}>
        <label>
          Énoncé
          <textarea bind:value={enonce} rows="2" required></textarea>
        </label>

        <label>
          Type
          <select value={type} onchange={(e) => changerType(e.currentTarget.value as TypeQuestion)}>
            <option value="qcm">QCM</option>
            <option value="vraifaux">Vrai / Faux</option>
            <option value="sondage">Sondage (sans bonne réponse)</option>
          </select>
        </label>

        {#if type !== 'vraifaux'}
          <div class="grille-choix">
            {#each LETTRES as lettre, index (lettre)}
              <label>
                Choix {lettre}
                <input
                  type="text"
                  bind:value={choixTextes[index]}
                  placeholder={`Réponse ${lettre}`}
                />
              </label>
            {/each}
          </div>
        {:else}
          <p class="aide">Choix fixes : Vrai / Faux.</p>
        {/if}

        {#if type !== 'sondage'}
          <label>
            Bonne réponse
            <select bind:value={bonneReponse}>
              <option value="">—</option>
              {#each LETTRES as lettre (lettre)}
                {#if choixTextes[LETTRES.indexOf(lettre)].trim()}
                  <option value={lettre}>{lettre} — {choixTextes[LETTRES.indexOf(lettre)]}</option>
                {/if}
              {/each}
            </select>
          </label>
        {/if}

        <div class="ligne-champs">
          <label>
            Compétence
            <input type="text" bind:value={competence} placeholder="optionnel" />
          </label>
          <label>
            Coefficient
            <input type="number" min="0.1" step="0.1" bind:value={coefficient} />
          </label>
          <label class="case-notee">
            <input type="checkbox" bind:checked={notee} disabled={type === 'sondage'} />
            Notée
          </label>
        </div>

        <div class="bloc-image">
          {#if image}
            <div class="image-choisie">
              <img src={image.url} alt="" />
              <div>
                <p class="attribution">{image.attribution}</p>
                <button type="button" onclick={() => (image = undefined)}>Retirer l'image</button>
              </div>
            </div>
          {:else if selecteurImageOuvert}
            <RechercheImages onchoisir={choisirImage} />
          {:else}
            <button type="button" onclick={() => (selecteurImageOuvert = true)}>
              Ajouter une image
            </button>
          {/if}
        </div>

        {#if erreurFormulaire}
          <p class="erreur">{erreurFormulaire}</p>
        {/if}

        <div class="actions-formulaire">
          <button type="submit" class="bouton-principal">
            {idEnEdition ? 'Enregistrer' : 'Ajouter la question'}
          </button>
          <button
            type="button"
            onclick={() => {
              formulaireOuvert = false;
              reinitialiserFormulaire();
            }}
          >
            Annuler
          </button>
        </div>
      </form>
    {/if}

    {#if questions.length === 0}
      <p class="aide">Aucune question pour l'instant.</p>
    {:else}
      <ul class="liste-questions">
        {#each questions as question, index (question.id)}
          <li class="ligne-question">
            <div class="deplacer">
              <button
                type="button"
                disabled={index === 0}
                onclick={() => deplacer(question, 'haut')}
                aria-label="Monter"
              >
                ▲
              </button>
              <button
                type="button"
                disabled={index === questions.length - 1}
                onclick={() => deplacer(question, 'bas')}
                aria-label="Descendre"
              >
                ▼
              </button>
            </div>
            <div class="contenu-question">
              <p class="enonce-question">{question.enonce}</p>
              <p class="meta-question">
                {question.type === 'qcm'
                  ? 'QCM'
                  : question.type === 'vraifaux'
                    ? 'Vrai/Faux'
                    : 'Sondage'}
                {#if question.bonneReponse}· bonne réponse : {question.bonneReponse}{/if}
                {#if question.competence}· {question.competence}{/if}
                {#if !question.notee}· non notée{/if}
              </p>
            </div>
            <div class="actions-question">
              <button type="button" onclick={() => ouvrirEdition(question)}>Modifier</button>
              <button type="button" class="bouton-supprimer" onclick={() => supprimer(question)}>
                Supprimer
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<style>
  .detail-banque {
    max-width: 48rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem 3rem;
  }
  .retour {
    color: var(--accent);
    text-decoration: none;
    font-size: 0.9rem;
  }
  .entete {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
  }
  h1 {
    margin: 0 0 0.25rem;
  }
  .sous-titre {
    color: var(--text-muted);
  }
  .actions-entete {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .actions-entete button,
  .bouton-fichier {
    position: relative;
    padding: 0.4rem 0.75rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    color: var(--text);
    cursor: pointer;
    font-size: 0.85rem;
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
    color: #15803d;
    margin-top: 1rem;
  }
  .erreur {
    color: #b91c1c;
    margin-top: 1rem;
  }
  .aide {
    color: var(--text-muted);
    margin-top: 1rem;
  }
  .bouton-principal {
    margin-top: 1.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: #fff;
    cursor: pointer;
    font-size: 0.95rem;
  }
  .formulaire-question {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background-color: #f8fafc;
  }
  .formulaire-question label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: var(--text);
  }
  .formulaire-question input,
  .formulaire-question select,
  .formulaire-question textarea {
    padding: 0.45rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    font-size: 0.95rem;
    font-family: inherit;
  }
  .grille-choix {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
  }
  .ligne-champs {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: end;
  }
  .ligne-champs label {
    flex: 1 1 8rem;
  }
  .case-notee {
    flex-direction: row !important;
    align-items: center;
    gap: 0.4rem !important;
  }
  .bloc-image button {
    padding: 0.4rem 0.75rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .image-choisie {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  .image-choisie img {
    width: 4rem;
    height: 4rem;
    object-fit: cover;
    border-radius: 0.4rem;
  }
  .attribution {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 0.4rem;
  }
  .actions-formulaire {
    display: flex;
    gap: 0.6rem;
  }
  .actions-formulaire button[type='submit'] {
    margin-top: 0;
  }
  .actions-formulaire button[type='button'] {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
  }
  .liste-questions {
    list-style: none;
    margin: 1.5rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .ligne-question {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.6rem 0.75rem;
  }
  .deplacer {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .deplacer button {
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 0.7rem;
    line-height: 1;
    padding: 0.1rem;
  }
  .deplacer button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .contenu-question {
    flex: 1;
    min-width: 0;
  }
  .enonce-question {
    color: var(--text-h);
    font-weight: 500;
  }
  .meta-question {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
  }
  .actions-question {
    display: flex;
    gap: 0.4rem;
  }
  .actions-question button {
    padding: 0.35rem 0.65rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .bouton-supprimer {
    color: #b91c1c !important;
  }
</style>
