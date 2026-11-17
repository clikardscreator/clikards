import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { creerBanque } from './banques';
import { db } from './database';
import {
  creerQuestion,
  deplacerQuestion,
  listerQuestionsParBanque,
  modifierQuestion,
  supprimerQuestion,
} from './questions';

async function creerBanqueTest() {
  return creerBanque({ titre: 'Banque de test' });
}

beforeEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

afterEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

describe('creerQuestion', () => {
  it('attribue un ordre croissant et une valeur par défaut au coefficient', async () => {
    const banque = await creerBanqueTest();
    const q1 = await creerQuestion(banque.id, {
      enonce: 'Question 1',
      type: 'qcm',
      choix: [
        { lettre: 'A', texte: 'Oui' },
        { lettre: 'B', texte: 'Non' },
      ],
      bonneReponse: 'A',
    });
    const q2 = await creerQuestion(banque.id, {
      enonce: 'Question 2',
      type: 'qcm',
      choix: [
        { lettre: 'A', texte: 'Oui' },
        { lettre: 'B', texte: 'Non' },
      ],
      bonneReponse: 'B',
    });

    expect(q1.ordre).toBe(0);
    expect(q2.ordre).toBe(1);
    expect(q1.coefficient).toBe(1);
    expect(q1.notee).toBe(true);
  });

  it('force notee à false et retire la bonne réponse pour un sondage', async () => {
    const banque = await creerBanqueTest();
    const question = await creerQuestion(banque.id, {
      enonce: 'Préférez-vous le jazz ?',
      type: 'sondage',
      choix: [
        { lettre: 'A', texte: 'Oui' },
        { lettre: 'B', texte: 'Non' },
      ],
      bonneReponse: 'A',
      notee: true,
    });

    expect(question.notee).toBe(false);
    expect(question.bonneReponse).toBeUndefined();
  });
});

describe('modifierQuestion', () => {
  it('met à jour les champs de la question', async () => {
    const banque = await creerBanqueTest();
    const question = await creerQuestion(banque.id, {
      enonce: 'Avant',
      type: 'qcm',
      choix: [
        { lettre: 'A', texte: 'Oui' },
        { lettre: 'B', texte: 'Non' },
      ],
      bonneReponse: 'A',
    });

    await modifierQuestion(question.id, {
      enonce: 'Après',
      type: 'qcm',
      choix: question.choix,
      bonneReponse: 'B',
      coefficient: 2,
    });

    const [misAJour] = await listerQuestionsParBanque(banque.id);
    expect(misAJour.enonce).toBe('Après');
    expect(misAJour.bonneReponse).toBe('B');
    expect(misAJour.coefficient).toBe(2);
  });
});

describe('deplacerQuestion', () => {
  it('échange l’ordre avec le voisin du dessus ou du dessous', async () => {
    const banque = await creerBanqueTest();
    const premiere = await creerQuestion(banque.id, {
      enonce: 'Première',
      type: 'sondage',
      choix: [],
    });
    const seconde = await creerQuestion(banque.id, {
      enonce: 'Seconde',
      type: 'sondage',
      choix: [],
    });

    await deplacerQuestion(seconde.id, 'haut');

    const apres = await listerQuestionsParBanque(banque.id);
    expect(apres.map((q) => q.enonce)).toEqual(['Seconde', 'Première']);

    await deplacerQuestion(seconde.id, 'haut');
    const inchange = await listerQuestionsParBanque(banque.id);
    expect(inchange.map((q) => q.enonce)).toEqual(['Seconde', 'Première']);
    expect(premiere.ordre).toBe(0);
  });
});

describe('supprimerQuestion', () => {
  it('retire la question de la banque', async () => {
    const banque = await creerBanqueTest();
    const question = await creerQuestion(banque.id, {
      enonce: 'À supprimer',
      type: 'sondage',
      choix: [],
    });

    await supprimerQuestion(question.id);

    expect(await listerQuestionsParBanque(banque.id)).toEqual([]);
  });
});
