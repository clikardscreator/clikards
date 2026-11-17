import { describe, expect, it } from 'vitest';
import { csvVersQuestions, questionsVersCsv } from './banqueCsv';
import type { Question } from './database';

function question(partiel: Partial<Question>): Question {
  return {
    id: 'id',
    banqueId: 'banque',
    ordre: 0,
    enonce: 'Énoncé',
    type: 'qcm',
    choix: [
      { lettre: 'A', texte: 'Piano' },
      { lettre: 'B', texte: 'Violon' },
    ],
    bonneReponse: 'A',
    coefficient: 1,
    notee: true,
    ...partiel,
  };
}

describe('questionsVersCsv', () => {
  it('exporte uniquement les questions QCM avec les bons en-têtes', () => {
    const csv = questionsVersCsv([
      question({ enonce: 'Quel instrument ?' }),
      question({ type: 'sondage', enonce: 'Un sondage, ignoré' }),
    ]);

    const lignes = csv.split('\n');
    expect(lignes[0]).toBe(
      'enonce;choixA;choixB;choixC;choixD;bonneReponse;competence;coefficient',
    );
    expect(lignes).toHaveLength(2);
    expect(lignes[1]).toBe('Quel instrument ?;Piano;Violon;;;A;;1');
  });

  it('échappe les champs contenant le séparateur ou des guillemets', () => {
    const csv = questionsVersCsv([
      question({ enonce: 'Entrée ; des cuivres, "forte"', competence: 'Timbre; nuances' }),
    ]);

    expect(csv).toContain('"Entrée ; des cuivres, ""forte"""');
    expect(csv).toContain('"Timbre; nuances"');
  });
});

describe('csvVersQuestions', () => {
  it('relit un export sans perte', () => {
    const csv = questionsVersCsv([question({ enonce: 'Quel instrument ?', competence: 'Timbre' })]);

    const [relue] = csvVersQuestions(csv);

    expect(relue.enonce).toBe('Quel instrument ?');
    expect(relue.choix).toEqual([
      { lettre: 'A', texte: 'Piano' },
      { lettre: 'B', texte: 'Violon' },
    ]);
    expect(relue.bonneReponse).toBe('A');
    expect(relue.competence).toBe('Timbre');
    expect(relue.coefficient).toBe(1);
  });

  it('ignore la ligne d’en-tête si présente', () => {
    const lignes = csvVersQuestions(
      'enonce;choixA;choixB;choixC;choixD;bonneReponse;competence;coefficient\nQ1;Oui;Non;;;A;;1',
    );
    expect(lignes).toHaveLength(1);
    expect(lignes[0].enonce).toBe('Q1');
  });

  it('accepte un fichier sans en-tête', () => {
    const lignes = csvVersQuestions('Q1;Oui;Non;;;A;;1');
    expect(lignes).toHaveLength(1);
    expect(lignes[0].enonce).toBe('Q1');
  });

  it('retombe sur un coefficient de 1 si la valeur est absente ou invalide', () => {
    const lignes = csvVersQuestions('Q1;Oui;Non;;;A;;');
    expect(lignes[0].coefficient).toBe(1);
  });

  it('ignore une bonne réponse qui ne correspond à aucune lettre valide', () => {
    const lignes = csvVersQuestions('Q1;Oui;Non;;;Z;;1');
    expect(lignes[0].bonneReponse).toBeUndefined();
  });
});
