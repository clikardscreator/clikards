import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import App from './App.svelte';

describe('App', () => {
  it('affiche le titre Clikards et les deux modes', () => {
    render(App);
    expect(screen.getByText('Clikards')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Projection' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scanner' })).toBeInTheDocument();
  });
});
