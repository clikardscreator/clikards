import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Compte from './Compte.svelte';

describe('Compte', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("affiche un message d'aide quand VITE_GOOGLE_CLIENT_ID n'est pas configuré", () => {
    // Forcé à vide explicitement : un vrai .env.local avec un identifiant peut
    // exister en développement local, le test ne doit pas en dépendre implicitement.
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    render(Compte);
    expect(
      screen.getByText(
        "La connexion avec un compte Google n'est pas encore configurée pour cette installation.",
      ),
    ).toBeInTheDocument();
  });
});
