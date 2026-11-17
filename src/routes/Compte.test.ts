import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Compte from './Compte.svelte';

describe('Compte', () => {
  it("affiche un message d'aide quand VITE_GOOGLE_CLIENT_ID n'est pas configuré", () => {
    render(Compte);
    expect(
      screen.getByText(
        "La connexion avec un compte Google n'est pas encore configurée pour cette installation.",
      ),
    ).toBeInTheDocument();
  });
});
