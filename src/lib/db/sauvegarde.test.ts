import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { creerClasse } from './classes';
import { db } from './database';
import { ajouterEleve } from './eleves';
import {
  analyserSauvegarde,
  exporterSauvegarde,
  FORMAT_VERSION_SAUVEGARDE,
  nomFichierSauvegarde,
  restaurerSauvegarde,
} from './sauvegarde';

beforeEach(async () => {
  await db.classes.clear();
  await db.eleves.clear();
});

afterEach(async () => {
  await db.classes.clear();
  await db.eleves.clear();
});

describe('exporterSauvegarde', () => {
  it('exporte les classes et élèves actuels avec le numéro de format', async () => {
    const classe = await creerClasse({ nom: '6e A', niveau: '6e', anneeScolaire: '2026-2027' });
    await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas' });

    const sauvegarde = await exporterSauvegarde();

    expect(sauvegarde.formatVersion).toBe(FORMAT_VERSION_SAUVEGARDE);
    expect(sauvegarde.classes).toHaveLength(1);
    expect(sauvegarde.eleves).toHaveLength(1);
    expect(sauvegarde.exporteLe).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('analyserSauvegarde', () => {
  it('accepte une sauvegarde valide', () => {
    const donnees = {
      formatVersion: 1,
      exporteLe: '2026-01-01T00:00:00.000Z',
      classes: [],
      eleves: [],
    };
    expect(analyserSauvegarde(donnees)).toEqual(donnees);
  });

  it('refuse un format de version inconnu', () => {
    expect(() => analyserSauvegarde({ formatVersion: 2, classes: [], eleves: [] })).toThrow(
      'non pris en charge',
    );
  });

  it('refuse une structure sans tableaux classes/eleves', () => {
    expect(() => analyserSauvegarde({ formatVersion: 1 })).toThrow('valide');
    expect(() => analyserSauvegarde(null)).toThrow('valide');
    expect(() => analyserSauvegarde('texte')).toThrow('valide');
  });
});

describe('restaurerSauvegarde', () => {
  it('remplace les données actuelles par celles de la sauvegarde', async () => {
    const ancienneClasse = await creerClasse({
      nom: 'Ancienne classe',
      niveau: '6e',
      anneeScolaire: '2025-2026',
    });
    await ajouterEleve({ classeId: ancienneClasse.id, nom: 'ANCIEN', prenom: 'Eleve' });

    await restaurerSauvegarde({
      formatVersion: FORMAT_VERSION_SAUVEGARDE,
      exporteLe: '2026-01-01T00:00:00.000Z',
      classes: [
        { id: 'c1', nom: 'Classe restaurée', niveau: '5e', anneeScolaire: '2026-2027', creeLe: 0 },
      ],
      eleves: [
        {
          id: 'e1',
          classeId: 'c1',
          nom: 'RESTAURE',
          prenom: 'Eleve',
          numeroCarte: 1,
          ordrePronote: 0,
        },
      ],
    });

    const classes = await db.classes.toArray();
    const eleves = await db.eleves.toArray();
    expect(classes).toEqual([
      { id: 'c1', nom: 'Classe restaurée', niveau: '5e', anneeScolaire: '2026-2027', creeLe: 0 },
    ]);
    expect(eleves).toHaveLength(1);
    expect(eleves[0].nom).toBe('RESTAURE');
  });

  it('gère une sauvegarde vide (tout supprimer)', async () => {
    const classe = await creerClasse({ nom: '6e A', niveau: '6e', anneeScolaire: '2026-2027' });
    await ajouterEleve({ classeId: classe.id, nom: 'MARTIN', prenom: 'Lucas' });

    await restaurerSauvegarde({
      formatVersion: FORMAT_VERSION_SAUVEGARDE,
      exporteLe: '2026-01-01T00:00:00.000Z',
      classes: [],
      eleves: [],
    });

    expect(await db.classes.toArray()).toEqual([]);
    expect(await db.eleves.toArray()).toEqual([]);
  });
});

describe('nomFichierSauvegarde', () => {
  it('inclut la date au format AAAA-MM-JJ', () => {
    const nom = nomFichierSauvegarde(new Date('2026-11-17T10:00:00.000Z'));
    expect(nom).toBe('clikards-sauvegarde-2026-11-17.json');
  });
});
