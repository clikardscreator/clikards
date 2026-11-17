import Dexie, { type Table } from 'dexie';

export type Niveau = '6e' | '5e' | '4e' | '3e';

export const NIVEAUX: Niveau[] = ['6e', '5e', '4e', '3e'];

export const NUMERO_CARTE_MAX = 63;

export interface Classe {
  id: string;
  nom: string;
  niveau: Niveau;
  anneeScolaire: string;
  creeLe: number;
}

export interface Eleve {
  id: string;
  classeId: string;
  nom: string;
  prenom: string;
  numeroCarte: number;
  ordrePronote: number;
}

/** Stockage générique clé/valeur pour les réglages de l'application (ex. sauvegarde auto). */
export interface LigneReglage {
  cle: string;
  valeur: unknown;
}

class ClikardsDatabase extends Dexie {
  classes!: Table<Classe, string>;
  eleves!: Table<Eleve, string>;
  reglages!: Table<LigneReglage, string>;

  constructor() {
    super('clikards');
    this.version(1).stores({
      classes: 'id, nom, niveau, anneeScolaire',
      eleves: 'id, classeId, [classeId+numeroCarte], ordrePronote',
    });
    // Nouveau magasin ajouté en version 2 : Dexie conserve automatiquement le
    // schéma des tables non mentionnées (classes, eleves) entre les versions.
    this.version(2).stores({
      reglages: 'cle',
    });
  }
}

export const db = new ClikardsDatabase();
