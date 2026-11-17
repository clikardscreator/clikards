import { describe, expect, it } from 'vitest';
import { extraireIdDossier } from './driveFichiers';

describe('extraireIdDossier', () => {
  it('extrait l’identifiant depuis un lien /drive/folders/', () => {
    expect(
      extraireIdDossier('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMn?usp=sharing'),
    ).toBe('1AbCdEfGhIjKlMn');
  });

  it('extrait l’identifiant depuis un lien avec compte (/drive/u/0/folders/)', () => {
    expect(extraireIdDossier('https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMn')).toBe(
      '1AbCdEfGhIjKlMn',
    );
  });

  it('extrait l’identifiant depuis un lien ?id=', () => {
    expect(extraireIdDossier('https://drive.google.com/open?id=1AbCdEfGhIjKlMn')).toBe(
      '1AbCdEfGhIjKlMn',
    );
  });

  it('accepte un identifiant déjà isolé', () => {
    expect(extraireIdDossier('1AbCdEfGhIjKlMn')).toBe('1AbCdEfGhIjKlMn');
  });

  it('retourne null pour un texte non reconnu', () => {
    expect(extraireIdDossier('pas un lien Drive')).toBeNull();
    expect(extraireIdDossier('')).toBeNull();
    expect(extraireIdDossier('https://example.com/autre-chose')).toBeNull();
  });

  it('ignore les espaces de début et de fin', () => {
    expect(extraireIdDossier('  1AbCdEfGhIjKlMn  ')).toBe('1AbCdEfGhIjKlMn');
  });
});
