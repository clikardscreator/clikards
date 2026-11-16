import type { RouteDefinition } from 'svelte-spa-router';
import Accueil from './Accueil.svelte';
import Compte from './Compte.svelte';
import Classes from './Classes.svelte';
import Banques from './Banques.svelte';
import Sons from './Sons.svelte';
import Projection from './Projection.svelte';
import Scanner from './Scanner.svelte';
import Resultats from './Resultats.svelte';
import Cartes from './Cartes.svelte';
import Reglages from './Reglages.svelte';
import Introuvable from './Introuvable.svelte';

export const routes: RouteDefinition = {
  '/': Accueil,
  '/compte': Compte,
  '/classes': Classes,
  '/banques': Banques,
  '/sons': Sons,
  '/session/:id': Projection,
  '/scan': Scanner,
  '/resultats': Resultats,
  '/cartes': Cartes,
  '/reglages': Reglages,
  '*': Introuvable,
};
