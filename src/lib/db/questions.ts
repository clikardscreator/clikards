import {
  db,
  type Choix,
  type ImageQuestion,
  type Lettre,
  type Question,
  type TypeQuestion,
} from './database';
import { signalerChangementDonnees } from './sauvegardeAuto';

export async function listerQuestionsParBanque(banqueId: string): Promise<Question[]> {
  const questions = await db.questions.where('banqueId').equals(banqueId).toArray();
  return questions.sort((a, b) => a.ordre - b.ordre);
}

export interface DonneesQuestion {
  enonce: string;
  type: TypeQuestion;
  choix: Choix[];
  bonneReponse?: Lettre;
  competence?: string;
  image?: ImageQuestion;
  coefficient?: number;
  notee?: boolean;
}

/** Normalise les champs dépendants du type (sondage sans bonne réponse, jamais noté). */
function normaliser(donnees: DonneesQuestion): Omit<Question, 'id' | 'banqueId' | 'ordre'> {
  const estSondage = donnees.type === 'sondage';
  return {
    enonce: donnees.enonce.trim(),
    type: donnees.type,
    choix: donnees.choix,
    bonneReponse: estSondage ? undefined : donnees.bonneReponse,
    competence: donnees.competence?.trim() || undefined,
    image: donnees.image,
    coefficient: donnees.coefficient ?? 1,
    notee: estSondage ? false : (donnees.notee ?? true),
  };
}

export async function creerQuestion(banqueId: string, donnees: DonneesQuestion): Promise<Question> {
  const existantes = await listerQuestionsParBanque(banqueId);
  const question: Question = {
    id: crypto.randomUUID(),
    banqueId,
    ordre: existantes.length,
    ...normaliser(donnees),
  };
  await db.questions.add(question);
  signalerChangementDonnees();
  return question;
}

export async function modifierQuestion(id: string, donnees: DonneesQuestion): Promise<void> {
  await db.questions.update(id, normaliser(donnees));
  signalerChangementDonnees();
}

export async function supprimerQuestion(id: string): Promise<void> {
  await db.questions.delete(id);
  signalerChangementDonnees();
}

/** Échange l'ordre avec le voisin précédent (haut) ou suivant (bas). */
export async function deplacerQuestion(id: string, direction: 'haut' | 'bas'): Promise<void> {
  const question = await db.questions.get(id);
  if (!question) return;

  const toutes = await listerQuestionsParBanque(question.banqueId);
  const position = toutes.findIndex((q) => q.id === id);
  const positionVoisine = direction === 'haut' ? position - 1 : position + 1;
  if (positionVoisine < 0 || positionVoisine >= toutes.length) return;

  const voisine = toutes[positionVoisine];
  await db.transaction('rw', db.questions, async () => {
    await db.questions.update(question.id, { ordre: voisine.ordre });
    await db.questions.update(voisine.id, { ordre: question.ordre });
  });
  signalerChangementDonnees();
}

/** Réordonnancement libre (glisser-déposer) : applique l'ordre donné par la liste d'identifiants. */
export async function reordonnerQuestions(idsEnOrdre: string[]): Promise<void> {
  await db.transaction('rw', db.questions, async () => {
    await Promise.all(idsEnOrdre.map((id, index) => db.questions.update(id, { ordre: index })));
  });
  signalerChangementDonnees();
}
