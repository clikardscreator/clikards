import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import App from './App.svelte';

describe('App', () => {
  it("affiche le menu de navigation et la page d'accueil par défaut", async () => {
    render(App);
    expect(screen.getByRole('link', { name: 'Clikards' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Classes' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Clikards' })).toBeInTheDocument();
  });
});
