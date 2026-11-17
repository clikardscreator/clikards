import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compterElevesParClasse, creerClasse, listerClasses, supprimerClasse } from './classes';
import { db } from './database';
import {
  ajouterEleve,
  importerElevesDepuisTexte,
  listerElevesParClasse,
  modifierNumeroCarte,
  supprimerEleve,
} from './eleves';

async function creerClasseTest(nom = '6e A') {
  return creerClasse({ nom, niveau: '6e', anneeScolaire: '2026-2027' });
}

beforeEach(async () => {
  await db.classes.clear();
  await db.eleves.clear();
});

afterEach(async () => {
  await db.classes.clear();
  await db.eleves.clear();
});

describe('classes', () => {
  it('crée puis liste les classes triées par nom', async () => {
    await creerClasseTest('6e B');
    await creerClasseTest('6e A');

    const classes = await listerClasses();
    expect(classes.map((c) => c.nom)).toEqual(['6e A', '6e B']);
  });

  it('supprime une classe et ses élèves', async () => {
    const classe = await creerClasseTest();
    await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas' });

    await supprimerClasse(classe.id);

    expect(await listerClasses()).toEqual([]);
    expect(await listerElevesParClasse(classe.id)).toEqual([]);
  });

  it('compte les élèves par classe', async () => {
    const classeA = await creerClasseTest('6e A');
    const classeB = await creerClasseTest('6e B');
    await ajouterEleve({ classeId: classeA.id, nom: 'MARTIN', prenom: 'Lucas' });
    await ajouterEleve({ classeId: classeA.id, nom: 'DUPONT', prenom: 'Lea' });

    const compte = await compterElevesParClasse();
    expect(compte[classeA.id]).toBe(2);
    expect(compte[classeB.id]).toBeUndefined();
  });
});

describe('ajouterEleve', () => {
  it('attribue automatiquement le prochain numéro de carte libre', async () => {
    const classe = await creerClasseTest();
    const premier = await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas' });
    const second = await ajouterEleve({ classeId: classe.id, nom: 'DUPONT', prenom: 'Lea' });

    expect(premier.numeroCarte).toBe(1);
    expect(second.numeroCarte).toBe(2);
  });

  it('refuse un numéro de carte déjà utilisé dans la même classe', async () => {
    const classe = await creerClasseTest();
    await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas', numeroCarte: 5 });

    await expect(
      ajouterEleve({ classeId: classe.id, nom: 'DUPONT', prenom: 'Lea', numeroCarte: 5 }),
    ).rejects.toThrow('déjà attribué');
  });

  it('autorise le même numéro de carte dans deux classes différentes', async () => {
    const classeA = await creerClasseTest('6e A');
    const classeB = await creerClasseTest('6e B');
    await ajouterEleve({ classeId: classeA.id, nom: 'MARTIN', prenom: 'Lucas', numeroCarte: 1 });

    await expect(
      ajouterEleve({ classeId: classeB.id, nom: 'DUPONT', prenom: 'Lea', numeroCarte: 1 }),
    ).resolves.toMatchObject({ numeroCarte: 1 });
  });

  it('refuse un nouvel élève au-delà de la limite de cartes', async () => {
    const classe = await creerClasseTest();
    for (let numero = 1; numero <= 63; numero += 1) {
      await ajouterEleve({
        classeId: classe.id,
        nom: `ELEVE${numero}`,
        prenom: '',
        numeroCarte: numero,
      });
    }

    await expect(ajouterEleve({ classeId: classe.id, nom: 'EN TROP', prenom: '' })).rejects.toThrow(
      'maximum de 63',
    );
  });
});

describe('modifierNumeroCarte', () => {
  it('modifie le numéro si libre', async () => {
    const classe = await creerClasseTest();
    const eleve = await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas' });

    await modifierNumeroCarte(eleve.id, 42);

    const [elèveMisAJour] = await listerElevesParClasse(classe.id);
    expect(elèveMisAJour.numeroCarte).toBe(42);
  });

  it('refuse un numéro déjà pris par un autre élève', async () => {
    const classe = await creerClasseTest();
    await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas', numeroCarte: 1 });
    const second = await ajouterEleve({
      classeId: classe.id,
      nom: 'DUPONT',
      prenom: 'Lea',
      numeroCarte: 2,
    });

    await expect(modifierNumeroCarte(second.id, 1)).rejects.toThrow('déjà attribué');
  });

  it('refuse un numéro hors limites', async () => {
    const classe = await creerClasseTest();
    const eleve = await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas' });

    await expect(modifierNumeroCarte(eleve.id, 0)).rejects.toThrow('entre 1 et 63');
    await expect(modifierNumeroCarte(eleve.id, 64)).rejects.toThrow('entre 1 et 63');
  });
});

describe('importerElevesDepuisTexte', () => {
  it('importe une liste collée en attribuant les numéros dans l’ordre', async () => {
    const classe = await creerClasseTest();

    const resultat = await importerElevesDepuisTexte(
      classe.id,
      'MARTIN Lucas\nDUPONT Marie Claire\nDE LA FONTAINE Jean',
    );

    expect(resultat).toEqual({ importes: 3, ignores: 0 });
    const eleves = await listerElevesParClasse(classe.id);
    expect(eleves.map((e) => [e.nom, e.prenom, e.numeroCarte])).toEqual([
      ['MARTIN', 'Lucas', 1],
      ['DUPONT', 'Marie Claire', 2],
      ['DE LA FONTAINE', 'Jean', 3],
    ]);
  });

  it('continue après les numéros déjà attribués manuellement', async () => {
    const classe = await creerClasseTest();
    await ajouterEleve({ classeId: classe.id, nom: 'EXISTANT', prenom: '', numeroCarte: 1 });

    await importerElevesDepuisTexte(classe.id, 'MARTIN Lucas');

    const eleves = await listerElevesParClasse(classe.id);
    const nouveau = eleves.find((e) => e.nom === 'MARTIN');
    expect(nouveau?.numeroCarte).toBe(2);
  });

  it('ignore les élèves excédentaires au-delà de 63 cartes', async () => {
    const classe = await creerClasseTest();
    for (let numero = 1; numero <= 62; numero += 1) {
      await ajouterEleve({
        classeId: classe.id,
        nom: `ELEVE${numero}`,
        prenom: '',
        numeroCarte: numero,
      });
    }

    const resultat = await importerElevesDepuisTexte(classe.id, 'MARTIN Lucas\nDUPONT Lea');

    expect(resultat).toEqual({ importes: 1, ignores: 1 });
  });
});

describe('supprimerEleve', () => {
  it('retire un élève de la classe', async () => {
    const classe = await creerClasseTest();
    const eleve = await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas' });

    await supprimerEleve(eleve.id);

    expect(await listerElevesParClasse(classe.id)).toEqual([]);
  });
});
