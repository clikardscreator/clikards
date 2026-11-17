import { describe, expect, it } from 'vitest';
import { analyserLigneEleve, analyserListeEleves } from './analyseListe';

describe('analyserLigneEleve', () => {
  it('sépare un nom simple en majuscules et un prénom', () => {
    expect(analyserLigneEleve('MARTIN Lucas')).toEqual({ nom: 'MARTIN', prenom: 'Lucas' });
  });

  it('gère un nom composé de plusieurs mots en majuscules', () => {
    expect(analyserLigneEleve('DE LA FONTAINE Jean')).toEqual({
      nom: 'DE LA FONTAINE',
      prenom: 'Jean',
    });
  });

  it('gère un prénom composé', () => {
    expect(analyserLigneEleve('DUPONT Marie Claire')).toEqual({
      nom: 'DUPONT',
      prenom: 'Marie Claire',
    });
  });

  it('gère les accents dans le nom', () => {
    expect(analyserLigneEleve('ÉVRARD Noé')).toEqual({ nom: 'ÉVRARD', prenom: 'Noé' });
  });

  it('gère un nom à tiret', () => {
    expect(analyserLigneEleve('JEAN-PIERRE Alice')).toEqual({
      nom: 'JEAN-PIERRE',
      prenom: 'Alice',
    });
  });

  it('retombe sur « premier mot = nom » si rien n’est en majuscules', () => {
    expect(analyserLigneEleve('martin lucas')).toEqual({ nom: 'martin', prenom: 'lucas' });
  });

  it('accepte une ligne séparée par une tabulation (collage CSV)', () => {
    expect(analyserLigneEleve('MARTIN\tLucas')).toEqual({ nom: 'MARTIN', prenom: 'Lucas' });
  });

  it('gère un seul mot (pas de prénom)', () => {
    expect(analyserLigneEleve('MARTIN')).toEqual({ nom: 'MARTIN', prenom: '' });
  });

  it('ignore les espaces en trop', () => {
    expect(analyserLigneEleve('  MARTIN    Lucas  ')).toEqual({ nom: 'MARTIN', prenom: 'Lucas' });
  });

  it('renvoie null pour une ligne vide', () => {
    expect(analyserLigneEleve('')).toBeNull();
    expect(analyserLigneEleve('   ')).toBeNull();
  });
});

describe('analyserListeEleves', () => {
  it('analyse plusieurs lignes et ignore les lignes vides', () => {
    const texte = 'MARTIN Lucas\n\nDUPONT Marie Claire\n   \nDE LA FONTAINE Jean';
    expect(analyserListeEleves(texte)).toEqual([
      { nom: 'MARTIN', prenom: 'Lucas' },
      { nom: 'DUPONT', prenom: 'Marie Claire' },
      { nom: 'DE LA FONTAINE', prenom: 'Jean' },
    ]);
  });

  it('renvoie un tableau vide pour un texte vide', () => {
    expect(analyserListeEleves('')).toEqual([]);
  });
});
