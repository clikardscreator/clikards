import { describe, expect, it } from 'vitest';
import { formaterTemps } from './temps';

describe('formaterTemps', () => {
  it('formate minutes et secondes avec un chiffre décimal', () => {
    expect(formaterTemps(83.4)).toBe('1:23.4');
    expect(formaterTemps(5)).toBe('0:05.0');
    expect(formaterTemps(0)).toBe('0:00.0');
  });

  it('retombe sur 0:00.0 pour une valeur invalide', () => {
    expect(formaterTemps(Number.NaN)).toBe('0:00.0');
    expect(formaterTemps(-3)).toBe('0:00.0');
    expect(formaterTemps(Number.POSITIVE_INFINITY)).toBe('0:00.0');
  });
});
