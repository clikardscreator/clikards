import type { Lettre, Question } from './database';

const SEPARATEUR = ';';
const ENTETE = [
  'enonce',
  'choixA',
  'choixB',
  'choixC',
  'choixD',
  'bonneReponse',
  'competence',
  'coefficient',
];
const LETTRES: Lettre[] = ['A', 'B', 'C', 'D'];

function echapperChamp(valeur: string): string {
  if (valeur.includes(SEPARATEUR) || valeur.includes('"') || valeur.includes('\n')) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

/** Export CSV simple, éditable dans un tableur : uniquement les questions de type QCM (2 à 4 choix). */
export function questionsVersCsv(questions: Question[]): string {
  const lignes = [ENTETE.join(SEPARATEUR)];

  for (const question of questions) {
    if (question.type !== 'qcm') continue;
    const choixParLettre = new Map(question.choix.map((c) => [c.lettre, c.texte]));
    const champs = [
      question.enonce,
      choixParLettre.get('A') ?? '',
      choixParLettre.get('B') ?? '',
      choixParLettre.get('C') ?? '',
      choixParLettre.get('D') ?? '',
      question.bonneReponse ?? '',
      question.competence ?? '',
      String(question.coefficient),
    ];
    lignes.push(champs.map(echapperChamp).join(SEPARATEUR));
  }

  return lignes.join('\n');
}

/** Découpe une ligne CSV en respectant les champs entre guillemets. */
function decouperLigne(ligne: string): string[] {
  const champs: string[] = [];
  let champActuel = '';
  let dansGuillemets = false;

  for (let i = 0; i < ligne.length; i += 1) {
    const caractere = ligne[i];
    if (dansGuillemets) {
      if (caractere === '"' && ligne[i + 1] === '"') {
        champActuel += '"';
        i += 1;
      } else if (caractere === '"') {
        dansGuillemets = false;
      } else {
        champActuel += caractere;
      }
    } else if (caractere === '"') {
      dansGuillemets = true;
    } else if (caractere === SEPARATEUR) {
      champs.push(champActuel);
      champActuel = '';
    } else {
      champActuel += caractere;
    }
  }
  champs.push(champActuel);
  return champs;
}

export interface QuestionCsv {
  enonce: string;
  choix: { lettre: Lettre; texte: string }[];
  bonneReponse?: Lettre;
  competence?: string;
  coefficient: number;
}

/** Importe des questions QCM depuis un texte CSV (en-tête identique à `questionsVersCsv`). */
export function csvVersQuestions(texte: string): QuestionCsv[] {
  const lignes = texte
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0);
  if (lignes.length === 0) return [];

  const corps = lignes[0].toLowerCase().startsWith('enonce') ? lignes.slice(1) : lignes;

  return corps.map((ligne) => {
    const champs = decouperLigne(ligne);
    const [enonce, choixA, choixB, choixC, choixD, bonneReponse, competence, coefficient] = champs;

    const choix = [choixA, choixB, choixC, choixD]
      .map((texte, index) => ({ lettre: LETTRES[index], texte: (texte ?? '').trim() }))
      .filter((c) => c.texte.length > 0);

    const lettreBonneReponse = (bonneReponse ?? '').trim().toUpperCase();

    return {
      enonce: (enonce ?? '').trim(),
      choix,
      bonneReponse: LETTRES.includes(lettreBonneReponse as Lettre)
        ? (lettreBonneReponse as Lettre)
        : undefined,
      competence: competence?.trim() || undefined,
      coefficient: Number(coefficient) > 0 ? Number(coefficient) : 1,
    };
  });
}

export function nomFichierCsv(titre: string): string {
  return `${titre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
}
