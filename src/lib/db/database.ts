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

/**
 * Image d'un diaporama de question. `url` pour une image distante (recherche
 * Openverse ou fichier Drive resté en ligne) ; `blob` pour une image importée
 * depuis le disque ou mise en cache depuis Drive (voir docs/DECISIONS.md :
 * les images `blob` ne sont pas incluses dans l'export JSON d'une banque).
 */
export interface ImageQuestion {
  url?: string;
  blob?: Blob;
  attribution?: string;
}

export interface AudioQuestion {
  sonId: string;
  debut?: number;
  fin?: number;
  lectureAuto: boolean;
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
  /** Diaporama : zéro, une ou plusieurs images affichées avec la question. */
  images?: ImageQuestion[];
  audio?: AudioQuestion;
  /** 1 par défaut. */
  coefficient: number;
  /** false pour un sondage ou une question d'échauffement. */
  notee: boolean;
}

/** Fichier son importé localement ou mis en cache depuis Google Drive (section 5 et 7). */
export interface Son {
  id: string;
  titre: string;
  nomFichier: string;
  mime: string;
  blob: Blob;
  sourceDriveId?: string;
  dossierDrive?: string;
  tags: string[];
  importeLe: number;
}

class ClikardsDatabase extends Dexie {
  classes!: Table<Classe, string>;
  eleves!: Table<Eleve, string>;
  reglages!: Table<LigneReglage, string>;
  banques!: Table<Banque, string>;
  questions!: Table<Question, string>;
  sons!: Table<Son, string>;

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
    this.version(4).stores({
      sons: 'id, titre, sourceDriveId',
    });
  }
}

export const db = new ClikardsDatabase();
