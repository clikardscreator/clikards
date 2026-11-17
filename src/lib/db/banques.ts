import { db, type Banque, type Niveau } from './database';
import { signalerChangementDonnees } from './sauvegardeAuto';

export async function listerBanques(): Promise<Banque[]> {
  const banques = await db.banques.toArray();
  return banques.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
}

export async function obtenirBanque(id: string): Promise<Banque | undefined> {
  return db.banques.get(id);
}

export async function creerBanque(donnees: {
  titre: string;
  niveau?: Niveau;
  tags?: string[];
}): Promise<Banque> {
  const maintenant = Date.now();
  const banque: Banque = {
    id: crypto.randomUUID(),
    titre: donnees.titre.trim(),
    niveau: donnees.niveau,
    tags: donnees.tags ?? [],
    version: 1,
    creeLe: maintenant,
    modifieLe: maintenant,
  };
  await db.banques.add(banque);
  signalerChangementDonnees();
  return banque;
}

export async function modifierBanque(
  id: string,
  patch: Partial<Pick<Banque, 'titre' | 'niveau' | 'tags'>>,
): Promise<void> {
  await db.banques.update(id, { ...patch, modifieLe: Date.now() });
  signalerChangementDonnees();
}

export async function supprimerBanque(id: string): Promise<void> {
  await db.transaction('rw', db.banques, db.questions, async () => {
    await db.questions.where('banqueId').equals(id).delete();
    await db.banques.delete(id);
  });
  signalerChangementDonnees();
}

/** Duplique une banque et toutes ses questions, avec de nouveaux identifiants. */
export async function dupliquerBanque(id: string): Promise<Banque> {
  const originale = await db.banques.get(id);
  if (!originale) {
    throw new Error('Banque introuvable.');
  }
  const questionsOriginales = await db.questions.where('banqueId').equals(id).toArray();

  const maintenant = Date.now();
  const copie: Banque = {
    ...originale,
    id: crypto.randomUUID(),
    titre: `${originale.titre} (copie)`,
    version: 1,
    creeLe: maintenant,
    modifieLe: maintenant,
  };
  const copiesQuestions = questionsOriginales.map((question) => ({
    ...question,
    id: crypto.randomUUID(),
    banqueId: copie.id,
  }));

  await db.transaction('rw', db.banques, db.questions, async () => {
    await db.banques.add(copie);
    if (copiesQuestions.length > 0) {
      await db.questions.bulkAdd(copiesQuestions);
    }
  });
  signalerChangementDonnees();
  return copie;
}

export async function compterQuestionsParBanque(): Promise<Record<string, number>> {
  const questions = await db.questions.toArray();
  const compte: Record<string, number> = {};
  for (const question of questions) {
    compte[question.banqueId] = (compte[question.banqueId] ?? 0) + 1;
  }
  return compte;
}
