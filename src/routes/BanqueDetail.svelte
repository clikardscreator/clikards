<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { modifierBanque, obtenirBanque } from '../lib/db/banques';
  import {
    creerQuestion,
    deplacerQuestion,
    modifierQuestion,
    listerQuestionsParBanque,
    reordonnerQuestions,
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
  import { importerSonDepuisDrive, importerSonLocal, listerSons } from '../lib/db/sons';
  import {
    NIVEAUX,
    type AudioQuestion,
    type Banque,
    type Choix,
    type ImageQuestion,
    type Lettre,
    type Niveau,
    type Question,
    type Son,
    type TypeQuestion,
  } from '../lib/db/database';
  import RechercheImages from '../components/RechercheImages.svelte';
  import ImageApercu from '../components/ImageApercu.svelte';
  import ImporterDepuisDrive from '../components/ImporterDepuisDrive.svelte';
  import ExtraitAudio from '../components/ExtraitAudio.svelte';
  import PrevisualisationProjection from '../components/PrevisualisationProjection.svelte';
  import type { ImageTrouvee } from '../lib/images/openverse';
  import { texteAttribution } from '../lib/images/openverse';

  let { params }: { params: { id: string } } = $props();

  let banque = $state<Banque | null | undefined>(undefined);
  let questions = $state<Question[]>([]);
  let sonsDisponibles = $state<Son[]>([]);
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
  let erreurFormulaire = $state('');

  let images = $state<ImageQuestion[]>([]);
  let modeAjoutImage = $state<'recherche' | 'drive' | null>(null);

  let audios = $state<AudioQuestion[]>([]);
  let ajoutAudioOuvert = $state(false);
  let sonPourAjout = $state('');
  let driveAudioOuvert = $state(false);

  let questionEnApercu = $state<Question | null>(null);

  let entreeImportJson: HTMLInputElement | undefined = $state();
  let entreeImportCsv: HTMLInputElement | undefined = $state();
  let messageImport = $state('');
  let erreurImport = $state('');

  let editionBanqueOuverte = $state(false);
  let titreBanque = $state('');
  let niveauBanque = $state<Niveau | ''>('');
  let tagsBanque = $state('');

  let indexDrague = $state<number | null>(null);

  const LETTRES: Lettre[] = ['A', 'B', 'C', 'D'];

  async function recharger() {
    chargement = true;
    const [banqueChargee, questionsChargees, sonsCharges] = await Promise.all([
      obtenirBanque(params.id),
      listerQuestionsParBanque(params.id),
      listerSons(),
    ]);
    banque = banqueChargee ?? null;
    questions = questionsChargees;
    sonsDisponibles = sonsCharges;
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
    erreurFormulaire = '';
    images = [];
    modeAjoutImage = null;
    audios = [];
    ajoutAudioOuvert = false;
    sonPourAjout = '';
    driveAudioOuvert = false;
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
    erreurFormulaire = '';
    images = question.images ? [...question.images] : [];
    modeAjoutImage = null;
    audios = question.audios ? [...question.audios] : [];
    ajoutAudioOuvert = false;
    sonPourAjout = '';
    driveAudioOuvert = false;
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

  function ajouterImageRecherche(trouvee: ImageTrouvee) {
    images = [...images, { url: trouvee.url, attribution: texteAttribution(trouvee) }];
    modeAjoutImage = null;
  }

  function ajouterImagesLocales(evenement: Event) {
    const fichiers = (evenement.currentTarget as HTMLInputElement).files;
    if (!fichiers) return;
    const nouvelles: ImageQuestion[] = Array.from(fichiers).map((fichier) => ({
      blob: fichier,
      attribution: fichier.name,
    }));
    images = [...images, ...nouvelles];
    (evenement.currentTarget as HTMLInputElement).value = '';
    modeAjoutImage = null;
  }

  function ajouterImageDrive(fichier: {
    nom: string;
    mime: string;
    blob: Blob;
    idDrive: string;
    dossier?: string;
  }) {
    const attribution = fichier.dossier ? `${fichier.dossier}/${fichier.nom}` : fichier.nom;
    images = [...images, { blob: fichier.blob, attribution }];
  }

  function retirerImage(index: number) {
    images = images.filter((_, i) => i !== index);
  }

  function deplacerImage(index: number, direction: 'gauche' | 'droite') {
    const cible = direction === 'gauche' ? index - 1 : index + 1;
    if (cible < 0 || cible >= images.length) return;
    const copie = [...images];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    images = copie;
  }

  function ajouterExtraitAudio() {
    if (!sonPourAjout) return;
    audios = [...audios, { sonId: sonPourAjout, lectureAuto: false }];
    sonPourAjout = '';
    ajoutAudioOuvert = false;
    driveAudioOuvert = false;
  }

  function retirerAudio(index: number) {
    audios = audios.filter((_, i) => i !== index);
  }

  function majPlageAudio(index: number, plage: { debut: number; fin: number }) {
    audios = audios.map((a, i) => (i === index ? { ...a, debut: plage.debut, fin: plage.fin } : a));
  }

  async function importerAudioLocalPourQuestion(evenement: Event) {
    // Capturer l'input avant le premier await : le navigateur remet
    // `currentTarget` à null une fois l'événement terminé, donc le relire
    // après un await plante avec « Cannot set properties of null ».
    const entree = evenement.currentTarget as HTMLInputElement;
    const fichier = entree.files?.[0];
    if (!fichier) return;
    const son = await importerSonLocal(fichier);
    sonsDisponibles = await listerSons();
    audios = [...audios, { sonId: son.id, lectureAuto: false }];
    ajoutAudioOuvert = false;
    entree.value = '';
  }

  async function importerAudioDrivePourQuestion(fichier: {
    nom: string;
    mime: string;
    blob: Blob;
    idDrive: string;
    dossier?: string;
  }) {
    const son = await importerSonDepuisDrive({ ...fichier, dossierDrive: fichier.dossier });
    sonsDisponibles = await listerSons();
    audios = [...audios, { sonId: son.id, lectureAuto: false }];
    ajoutAudioOuvert = false;
    driveAudioOuvert = false;
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
      // $state.snapshot : les tableaux/objets $state de Svelte 5 sont des
      // proxys réactifs que le clonage structuré d'IndexedDB ne sait pas
      // sérialiser tels quels (DataCloneError à l'écriture Dexie).
      images: $state.snapshot(images),
      audios: $state.snapshot(audios),
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

  function debuterDeplacement(index: number) {
    indexDrague = index;
  }

  async function deposerSur(indexCible: number) {
    if (indexDrague === null || indexDrague === indexCible) {
      indexDrague = null;
      return;
    }
    const nouvelOrdre = [...questions];
    const [deplacee] = nouvelOrdre.splice(indexDrague, 1);
    nouvelOrdre.splice(indexCible, 0, deplacee);
    questions = nouvelOrdre;
    indexDrague = null;
    await reordonnerQuestions(nouvelOrdre.map((q) => q.id));
  }

  function ouvrirEditionBanque() {
    if (!banque) return;
    titreBanque = banque.titre;
    niveauBanque = banque.niveau ?? '';
    tagsBanque = banque.tags.join(', ');
    editionBanqueOuverte = true;
  }

  async function validerEditionBanque(evenement: SubmitEvent) {
    evenement.preventDefault();
    if (!titreBanque.trim()) return;
    await modifierBanque(params.id, {
      titre: titreBanque,
      niveau: niveauBanque || undefined,
      tags: tagsBanque
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    });
    editionBanqueOuverte = false;
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
      {#if editionBanqueOuverte}
        <form class="formulaire-banque" onsubmit={validerEditionBanque}>
          <label>
            Titre
            <input type="text" bind:value={titreBanque} required />
          </label>
          <label>
            Niveau
            <select bind:value={niveauBanque}>
              <option value="">—</option>
              {#each NIVEAUX as unNiveau (unNiveau)}
                <option value={unNiveau}>{unNiveau}</option>
              {/each}
            </select>
          </label>
          <label>
            Tags (séparés par des virgules)
            <input type="text" bind:value={tagsBanque} placeholder="timbre, 6e, démonstration" />
          </label>
          <div class="actions-formulaire">
            <button type="submit" class="bouton-principal">Enregistrer</button>
            <button type="button" onclick={() => (editionBanqueOuverte = false)}>Annuler</button>
          </div>
        </form>
      {:else}
        <div>
          <h1>{banque.titre}</h1>
          <p class="sous-titre">
            {#if banque.niveau}{banque.niveau} ·
            {/if}{questions.length} question{questions.length > 1 ? 's' : ''}
            {#if banque.tags.length > 0}· {banque.tags.join(', ')}{/if}
          </p>
          <button type="button" class="lien-modifier" onclick={ouvrirEditionBanque}>
            Modifier le titre, le niveau ou les tags
          </button>
        </div>
      {/if}
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

        <div class="bloc-images">
          <p class="etiquette">Images (diaporama)</p>

          {#if images.length > 0}
            <ul class="diaporama">
              {#each images as img, index (index)}
                <li>
                  <ImageApercu image={img} alt="" class="vignette" />
                  <p class="attribution" title={img.attribution}>{img.attribution}</p>
                  <div class="actions-vignette">
                    <button
                      type="button"
                      disabled={index === 0}
                      onclick={() => deplacerImage(index, 'gauche')}
                      aria-label="Déplacer vers la gauche"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onclick={() => deplacerImage(index, 'droite')}
                      aria-label="Déplacer vers la droite"
                    >
                      ▶
                    </button>
                    <button type="button" onclick={() => retirerImage(index)}>Retirer</button>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}

          {#if modeAjoutImage === 'recherche'}
            <RechercheImages onchoisir={ajouterImageRecherche} />
            <button type="button" onclick={() => (modeAjoutImage = null)}>Fermer</button>
          {:else if modeAjoutImage === 'drive'}
            <ImporterDepuisDrive typeMime="image" onimporter={ajouterImageDrive} />
            <button type="button" onclick={() => (modeAjoutImage = null)}>Fermer</button>
          {:else}
            <div class="choix-ajout">
              <button type="button" onclick={() => (modeAjoutImage = 'recherche')}>
                Rechercher (Openverse)
              </button>
              <label class="bouton-fichier-mini">
                Depuis mon ordinateur
                <input type="file" accept="image/*" multiple onchange={ajouterImagesLocales} />
              </label>
              <button type="button" onclick={() => (modeAjoutImage = 'drive')}>
                Depuis Google Drive
              </button>
            </div>
          {/if}
        </div>

        <div class="bloc-audio">
          <p class="etiquette">Extraits audio</p>

          {#if audios.length > 0}
            <ul class="liste-extraits">
              {#each audios as audioQuestion, index (index)}
                {@const son = sonsDisponibles.find((s) => s.id === audioQuestion.sonId)}
                <li class="extrait-ligne">
                  <div class="entete-extrait">
                    <span class="titre-son">{son?.titre ?? 'Son introuvable'}</span>
                    <label class="case-notee">
                      <input
                        type="checkbox"
                        checked={audioQuestion.lectureAuto}
                        onchange={(e) =>
                          (audios = audios.map((a, i) =>
                            i === index ? { ...a, lectureAuto: e.currentTarget.checked } : a,
                          ))}
                      />
                      Lecture auto
                    </label>
                    <button type="button" onclick={() => retirerAudio(index)}>Retirer</button>
                  </div>
                  {#if son}
                    <ExtraitAudio
                      blob={son.blob}
                      debut={audioQuestion.debut ?? 0}
                      fin={audioQuestion.fin}
                      modifiable
                      onchange={(plage) => majPlageAudio(index, plage)}
                    />
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}

          {#if !ajoutAudioOuvert}
            <button type="button" onclick={() => (ajoutAudioOuvert = true)}>
              + Ajouter un extrait audio
            </button>
          {:else}
            <div class="choix-ajout">
              {#if sonsDisponibles.length > 0}
                <select bind:value={sonPourAjout}>
                  <option value="">— Choisir un son existant —</option>
                  {#each sonsDisponibles as son (son.id)}
                    <option value={son.id}>{son.titre}</option>
                  {/each}
                </select>
                <button type="button" disabled={!sonPourAjout} onclick={ajouterExtraitAudio}>
                  Ajouter
                </button>
              {/if}
              <label class="bouton-fichier-mini">
                Depuis mon ordinateur
                <input type="file" accept="audio/*" onchange={importerAudioLocalPourQuestion} />
              </label>
              <button type="button" onclick={() => (driveAudioOuvert = !driveAudioOuvert)}>
                Depuis Google Drive
              </button>
              <button
                type="button"
                onclick={() => {
                  ajoutAudioOuvert = false;
                  driveAudioOuvert = false;
                }}
              >
                Fermer
              </button>
            </div>
            {#if driveAudioOuvert}
              <ImporterDepuisDrive typeMime="audio" onimporter={importerAudioDrivePourQuestion} />
            {/if}
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
      <p class="aide">Glissez une question par sa poignée (⠿) pour la réordonner.</p>
      <ul class="liste-questions">
        {#each questions as question, index (question.id)}
          <li
            class="ligne-question"
            class:en-glissement={indexDrague === index}
            ondragover={(e) => e.preventDefault()}
            ondrop={() => deposerSur(index)}
          >
            <span
              class="poignee"
              draggable="true"
              ondragstart={() => debuterDeplacement(index)}
              aria-label="Glisser pour réordonner"
              role="button"
              tabindex="0"
            >
              ⠿
            </span>
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
                {#if question.images?.length}
                  · {question.images.length} image{question.images.length > 1 ? 's' : ''}
                {/if}
                {#if question.audios?.length}
                  · {question.audios.length} extrait{question.audios.length > 1 ? 's' : ''} audio
                {/if}
              </p>
            </div>
            <div class="actions-question">
              <button type="button" onclick={() => (questionEnApercu = question)}>Aperçu</button>
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

{#if questionEnApercu}
  <PrevisualisationProjection
    question={questionEnApercu}
    sons={sonsDisponibles}
    onfermer={() => (questionEnApercu = null)}
  />
{/if}

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
  .lien-modifier {
    margin-top: 0.4rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.8rem;
    text-decoration: underline;
  }
  .formulaire-banque {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: end;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background-color: #f8fafc;
    flex: 1 1 100%;
  }
  .formulaire-banque label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: var(--text);
  }
  .formulaire-banque input,
  .formulaire-banque select {
    padding: 0.45rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    font-size: 0.95rem;
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
  .etiquette {
    font-size: 0.85rem;
    color: var(--text);
    font-weight: 500;
    margin: 0 0 0.25rem;
  }
  .bloc-images,
  .bloc-audio {
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }
  .diaporama {
    list-style: none;
    margin: 0 0 0.75rem;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .diaporama li {
    width: 8rem;
    text-align: center;
  }
  .diaporama :global(.vignette) {
    width: 8rem;
    height: 6rem;
    object-fit: cover;
    border-radius: 0.4rem;
    display: block;
  }
  .attribution {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin: 0.3rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .actions-vignette {
    display: flex;
    justify-content: center;
    gap: 0.2rem;
  }
  .actions-vignette button,
  .choix-ajout button,
  .bouton-fichier-mini,
  .bloc-audio > button {
    position: relative;
    padding: 0.3rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
    font-size: 0.75rem;
  }
  .actions-vignette button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .choix-ajout {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .choix-ajout button,
  .bouton-fichier-mini {
    font-size: 0.85rem;
    padding: 0.45rem 0.8rem;
  }
  .bouton-fichier-mini input[type='file'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  .bloc-audio select {
    padding: 0.45rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
  }
  .bloc-audio > button {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    padding: 0.45rem 0.8rem;
  }
  .liste-extraits {
    list-style: none;
    margin: 0 0 0.75rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .extrait-ligne {
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background-color: #fff;
  }
  .entete-extrait {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .entete-extrait .titre-son {
    flex: 1;
    font-weight: 500;
    color: var(--text-h);
    font-size: 0.9rem;
  }
  .entete-extrait button {
    padding: 0.3rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    background: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: #b91c1c;
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
  .ligne-question.en-glissement {
    opacity: 0.4;
  }
  .poignee {
    cursor: grab;
    color: var(--text-muted);
    font-size: 1.1rem;
    user-select: none;
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
