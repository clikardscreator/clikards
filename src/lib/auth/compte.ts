import { writable } from 'svelte/store';
import type { ProfilCompte } from './google';

/**
 * Profil du compte connecté. Volontairement en mémoire uniquement (pas de
 * persistance localStorage/IndexedDB à ce stade) : voir docs/DECISIONS.md.
 */
export const compte = writable<ProfilCompte | null>(null);
