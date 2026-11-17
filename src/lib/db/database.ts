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

class ClikardsDatabase extends Dexie {
  classes!: Table<Classe, string>;
  eleves!: Table<Eleve, string>;

  constructor() {
    super('clikards');
    this.version(1).stores({
      classes: 'id, nom, niveau, anneeScolaire',
      eleves: 'id, classeId, [classeId+numeroCarte], ordrePronote',
    });
  }
}

export const db = new ClikardsDatabase();
