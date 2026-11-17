import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { creerBanque } from './banques';
import { db } from './database';
import { analyserExportBanque, exporterBanque, importerBanque } from './banqueExport';
import { creerQuestion, listerQuestionsParBanque } from './questions';

beforeEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

afterEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

describe('exporterBanque / importerBanque', () => {
  it('exporte puis réimporte une banque comme nouvelle banque', async () => {
    const originale = await creerBanque({ titre: 'Timbres', niveau: '6e' });
    await creerQuestion(originale.id, {
      enonce: 'Quel instrument ?',
      type: 'qcm',
      choix: [
        { lettre: 'A', texte: 'Piano' },
        { lettre: 'B', texte: 'Violon' },
      ],
      bonneReponse: 'A',
      competence: 'Timbre',
    });

    const exportBanque = await exporterBanque(originale.id);
    expect(exportBanque.formatVersion).toBe(1);
    expect(exportBanque.questions).toHaveLength(1);
    expect('id' in exportBanque.questions[0]).toBe(false);

    const importee = await importerBanque(exportBanque);

    expect(importee.id).not.toBe(originale.id);
    expect(importee.titre).toBe('Timbres');
    const questions = await listerQuestionsParBanque(importee.id);
    expect(questions).toHaveLength(1);
    expect(questions[0].enonce).toBe('Quel instrument ?');
    expect(questions[0].banqueId).toBe(importee.id);
  });
});

describe('analyserExportBanque', () => {
  it('rejette un format de version différent', () => {
    expect(() => analyserExportBanque({ formatVersion: 2, banque: {}, questions: [] })).toThrow(
      'version',
    );
  });

  it('rejette un objet sans les champs attendus', () => {
    expect(() => analyserExportBanque({ formatVersion: 1 })).toThrow('valide');
    expect(() => analyserExportBanque(null)).toThrow('valide');
  });
});
