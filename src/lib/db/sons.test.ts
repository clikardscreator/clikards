import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import {
  formaterTailleOctets,
  importerSonDepuisDrive,
  importerSonLocal,
  listerSons,
  obtenirSon,
  renommerSon,
  supprimerSon,
} from './sons';

beforeEach(async () => {
  await db.sons.clear();
});

afterEach(async () => {
  await db.sons.clear();
});

function fichierTest(nom = 'Entree-des-cuivres.mp3', contenu = 'abcde') {
  return new File([contenu], nom, { type: 'audio/mpeg' });
}

describe('importerSonLocal', () => {
  it('crée un son à partir du fichier choisi, titre sans extension', async () => {
    const son = await importerSonLocal(fichierTest());

    expect(son.titre).toBe('Entree-des-cuivres');
    expect(son.nomFichier).toBe('Entree-des-cuivres.mp3');
    expect(son.mime).toBe('audio/mpeg');
    expect(son.blob.size).toBe(5);

    const sons = await listerSons();
    expect(sons.map((s) => s.id)).toEqual([son.id]);
  });
});

describe('importerSonDepuisDrive', () => {
  it('crée un son avec les références Drive', async () => {
    const son = await importerSonDepuisDrive({
      nom: 'Theme.mp3',
      mime: 'audio/mpeg',
      blob: new Blob(['xy'], { type: 'audio/mpeg' }),
      idDrive: 'fichier-123',
      dossierDrive: 'dossier-abc',
    });

    expect(son.titre).toBe('Theme');
    expect(son.sourceDriveId).toBe('fichier-123');
    expect(son.dossierDrive).toBe('dossier-abc');
  });
});

describe('listerSons', () => {
  it('trie par titre', async () => {
    await importerSonLocal(fichierTest('B.mp3'));
    await importerSonLocal(fichierTest('A.mp3'));

    const sons = await listerSons();
    expect(sons.map((s) => s.titre)).toEqual(['A', 'B']);
  });
});

describe('renommerSon / supprimerSon', () => {
  it('renomme puis supprime un son', async () => {
    const son = await importerSonLocal(fichierTest());

    await renommerSon(son.id, 'Nouveau titre');
    expect((await obtenirSon(son.id))?.titre).toBe('Nouveau titre');

    await supprimerSon(son.id);
    expect(await obtenirSon(son.id)).toBeUndefined();
  });
});

// tailleTotaleCacheSons() n'est volontairement pas testée automatiquement :
// fake-indexeddb ne clone pas correctement un Blob sous jsdom (il revient en
// `{}`, `.size` devient `undefined`), contrairement à un vrai navigateur où
// IndexedDB stocke les Blob nativement. Même limitation déjà documentée pour
// sauvegardeAuto.ts — à vérifier manuellement dans le navigateur.

describe('formaterTailleOctets', () => {
  it('choisit l’unité la plus lisible', () => {
    expect(formaterTailleOctets(512)).toBe('512 o');
    expect(formaterTailleOctets(2048)).toBe('2.0 Ko');
    expect(formaterTailleOctets(5 * 1024 * 1024)).toBe('5.0 Mo');
  });
});
