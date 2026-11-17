import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  compterQuestionsParBanque,
  creerBanque,
  dupliquerBanque,
  listerBanques,
  modifierBanque,
  obtenirBanque,
  supprimerBanque,
} from './banques';
import { db } from './database';
import { creerQuestion, listerQuestionsParBanque } from './questions';

beforeEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

afterEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

describe('banques', () => {
  it('crée puis liste les banques triées par titre', async () => {
    await creerBanque({ titre: 'Timbres B' });
    await creerBanque({ titre: 'Timbres A' });

    const banques = await listerBanques();
    expect(banques.map((b) => b.titre)).toEqual(['Timbres A', 'Timbres B']);
  });

  it('modifie une banque et met à jour modifieLe', async () => {
    const banque = await creerBanque({ titre: 'Formes' });

    await modifierBanque(banque.id, { titre: 'Formes musicales' });

    const misAJour = await obtenirBanque(banque.id);
    expect(misAJour?.titre).toBe('Formes musicales');
    expect(misAJour?.modifieLe).toBeGreaterThanOrEqual(banque.modifieLe);
  });

  it('supprime une banque et toutes ses questions', async () => {
    const banque = await creerBanque({ titre: 'Timbres' });
    await creerQuestion(banque.id, {
      enonce: 'Quel instrument ?',
      type: 'qcm',
      choix: [
        { lettre: 'A', texte: 'Piano' },
        { lettre: 'B', texte: 'Violon' },
      ],
      bonneReponse: 'A',
    });

    await supprimerBanque(banque.id);

    expect(await listerBanques()).toEqual([]);
    expect(await listerQuestionsParBanque(banque.id)).toEqual([]);
  });

  it('compte les questions par banque', async () => {
    const banqueA = await creerBanque({ titre: 'A' });
    const banqueB = await creerBanque({ titre: 'B' });
    await creerQuestion(banqueA.id, {
      enonce: 'Q1',
      type: 'sondage',
      choix: [
        { lettre: 'A', texte: 'Oui' },
        { lettre: 'B', texte: 'Non' },
      ],
    });

    const compte = await compterQuestionsParBanque();
    expect(compte[banqueA.id]).toBe(1);
    expect(compte[banqueB.id]).toBeUndefined();
  });
});

describe('dupliquerBanque', () => {
  it('copie la banque et ses questions avec de nouveaux identifiants', async () => {
    const originale = await creerBanque({ titre: 'Timbres', niveau: '6e' });
    await creerQuestion(originale.id, {
      enonce: 'Quel instrument ?',
      type: 'qcm',
      choix: [
        { lettre: 'A', texte: 'Piano' },
        { lettre: 'B', texte: 'Violon' },
      ],
      bonneReponse: 'A',
    });

    const copie = await dupliquerBanque(originale.id);

    expect(copie.id).not.toBe(originale.id);
    expect(copie.titre).toBe('Timbres (copie)');
    const questionsCopie = await listerQuestionsParBanque(copie.id);
    const questionsOriginales = await listerQuestionsParBanque(originale.id);
    expect(questionsCopie).toHaveLength(1);
    expect(questionsCopie[0].id).not.toBe(questionsOriginales[0].id);
    expect(questionsCopie[0].enonce).toBe(questionsOriginales[0].enonce);
  });
});
