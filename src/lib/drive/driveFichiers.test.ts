import { afterEach, describe, expect, it, vi } from 'vitest';
import { extraireIdDossier, listerFichiersDossier, telechargerFichierDrive } from './driveFichiers';

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

describe('listerFichiersDossier', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('refuse sans clé API configurée, avec un message explicite', async () => {
    // Forcé à vide explicitement : un vrai .env.local avec une clé peut exister
    // en développement local, le test ne doit pas en dépendre implicitement.
    vi.stubEnv('VITE_GOOGLE_API_KEY', '');
    await expect(listerFichiersDossier('abc', 'audio')).rejects.toThrow('VITE_GOOGLE_API_KEY');
  });

  it("remonte le message d'erreur précis renvoyé par Google plutôt qu'un simple code HTTP", async () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'cle-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            message:
              'Google Drive API has not been used in project 123456789 before or it is disabled.',
          },
        }),
      }),
    );

    await expect(listerFichiersDossier('abc', 'audio')).rejects.toThrow(
      'Google Drive API has not been used',
    );
  });

  it('retombe sur un message générique utile quand la réponse ne contient pas de JSON exploitable', async () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'cle-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => {
          throw new Error('pas du JSON');
        },
      }),
    );

    await expect(listerFichiersDossier('abc', 'audio')).rejects.toThrow('docs/GOOGLE_SETUP.md');
  });

  it('transforme la réponse Drive en fichiers exploitables, en filtrant le mimeType côté client', async () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'cle-test');
    const fetchSimule = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [
          { id: 'f1', name: 'Entrée des cuivres.mp3', mimeType: 'audio/mpeg' },
          { id: 'img1', name: 'Photo.jpg', mimeType: 'image/jpeg' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchSimule);

    const fichiers = await listerFichiersDossier('abc', 'audio');

    expect(fichiers).toEqual([
      {
        id: 'f1',
        nom: 'Entrée des cuivres.mp3',
        mimeType: 'audio/mpeg',
        modifiedTime: undefined,
        dossier: undefined,
      },
    ]);
    const [urlAppelee] = fetchSimule.mock.calls[0] as [string];
    expect(urlAppelee).toContain('%27abc%27+in+parents');
    expect(urlAppelee).toContain('key=cle-test');
  });

  it('parcourt les sous-dossiers récursivement et tague chaque fichier avec son chemin', async () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'cle-test');

    // Arborescence simulée :
    // racine/ (Theme-racine.mp3, BAROQUE/)
    //   BAROQUE/ (Theme-baroque.mp3, Instruments/)
    //     Instruments/ (Theme-instruments.mp3)
    const reponsesParDossier: Record<string, unknown> = {
      racine: {
        files: [
          { id: 'f-racine', name: 'Theme-racine.mp3', mimeType: 'audio/mpeg' },
          { id: 'd-baroque', name: 'BAROQUE', mimeType: 'application/vnd.google-apps.folder' },
        ],
      },
      'd-baroque': {
        files: [
          { id: 'f-baroque', name: 'Theme-baroque.mp3', mimeType: 'audio/mpeg' },
          {
            id: 'd-instruments',
            name: 'Instruments',
            mimeType: 'application/vnd.google-apps.folder',
          },
        ],
      },
      'd-instruments': {
        files: [{ id: 'f-instruments', name: 'Theme-instruments.mp3', mimeType: 'audio/mpeg' }],
      },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const requete = new URL(url).searchParams.get('q') ?? '';
        const idInterroge = /'([^']*)'/.exec(requete)?.[1] ?? 'racine';
        return Promise.resolve({
          ok: true,
          json: async () => reponsesParDossier[idInterroge] ?? { files: [] },
        });
      }),
    );

    const fichiers = await listerFichiersDossier('racine', 'audio');

    expect(fichiers.map((f) => [f.nom, f.dossier])).toEqual([
      ['Theme-racine.mp3', undefined],
      ['Theme-baroque.mp3', 'BAROQUE'],
      ['Theme-instruments.mp3', 'BAROQUE/Instruments'],
    ]);
  });
});

describe('telechargerFichierDrive', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("remonte le message d'erreur Google en cas d'échec", async () => {
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'cle-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'The caller does not have permission' } }),
      }),
    );

    await expect(telechargerFichierDrive('f1')).rejects.toThrow(
      'The caller does not have permission',
    );
  });
});
