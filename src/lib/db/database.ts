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

export type TypeQuestion = 'qcm' | 'vraifaux' | 'sondage';
export type Lettre = 'A' | 'B' | 'C' | 'D';

export interface Choix {
  lettre: Lettre;
  texte: string;
}

export interface ImageQuestion {
  url: string;
  attribution: string;
}

export interface Banque {
  id: string;
  titre: string;
  niveau?: Niveau;
  tags: string[];
  auteur?: string;
  version: number;
  creeLe: number;
  modifieLe: number;
}

export interface Question {
  id: string;
  banqueId: string;
  ordre: number;
  enonce: string;
  type: TypeQuestion;
  choix: Choix[];
  /** Absente pour un sondage. */
  bonneReponse?: Lettre;
  competence?: string;
  image?: ImageQuestion;
  /** 1 par défaut. */
  coefficient: number;
  /** false pour un sondage ou une question d'échauffement. */
  notee: boolean;
}

class ClikardsDatabase extends Dexie {
  classes!: Table<Classe, string>;
  eleves!: Table<Eleve, string>;
  reglages!: Table<LigneReglage, string>;
  banques!: Table<Banque, string>;
  questions!: Table<Question, string>;

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
    this.version(3).stores({
      banques: 'id, titre, niveau',
      questions: 'id, banqueId, [banqueId+ordre]',
    });
  }
}

export const db = new ClikardsDatabase();
