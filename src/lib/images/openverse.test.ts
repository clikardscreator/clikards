import { afterEach, describe, expect, it, vi } from 'vitest';
import { rechercherImages, texteAttribution } from './openverse';

describe('rechercherImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('transforme la réponse Openverse en images exploitables', async () => {
    const fetchSimule = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result_count: 1,
        results: [
          {
            id: 'abc123',
            title: 'Piano à queue',
            url: 'https://exemple.test/piano.jpg',
            thumbnail: 'https://exemple.test/piano-thumb.jpg',
            license: 'by-sa',
            creator: 'Quelqu’un',
            foreign_landing_url: 'https://exemple.test/page',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchSimule);

    const resultat = await rechercherImages('piano');

    expect(resultat.total).toBe(1);
    expect(resultat.images).toEqual([
      {
        id: 'abc123',
        titre: 'Piano à queue',
        url: 'https://exemple.test/piano.jpg',
        miniature: 'https://exemple.test/piano-thumb.jpg',
        licence: 'BY-SA',
        auteur: 'Quelqu’un',
        pageOrigine: 'https://exemple.test/page',
      },
    ]);
    expect(fetchSimule).toHaveBeenCalledWith(expect.stringContaining('q=piano'));
  });

  it('lève une erreur explicite si Openverse répond en erreur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(rechercherImages('piano')).rejects.toThrow('503');
  });
});

describe('texteAttribution', () => {
  it("inclut le titre, l'auteur, la licence et le lien", () => {
    const texte = texteAttribution({
      id: '1',
      titre: 'Guitare',
      url: 'https://exemple.test/guitare.jpg',
      miniature: 'https://exemple.test/guitare-thumb.jpg',
      licence: 'CC0',
      auteur: 'Jean',
      pageOrigine: 'https://exemple.test/guitare',
    });

    expect(texte).toBe('« Guitare », par Jean, licence CC0 — https://exemple.test/guitare');
  });
});
