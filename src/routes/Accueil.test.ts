import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Accueil from './Accueil.svelte';

describe('Accueil', () => {
  it('affiche le titre Clikards et les deux liens de navigation', () => {
    render(Accueil);
    expect(screen.getByRole('heading', { name: 'Clikards' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projection' })).toHaveAttribute(
      'href',
      '#/session/nouvelle',
    );
    expect(screen.getByRole('link', { name: 'Scanner' })).toHaveAttribute('href', '#/scan');
  });
});
