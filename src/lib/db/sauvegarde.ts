import { db, type Classe, type Eleve } from './database';

export const FORMAT_VERSION_SAUVEGARDE = 1;

export interface Sauvegarde {
  formatVersion: typeof FORMAT_VERSION_SAUVEGARDE;
  exporteLe: string;
  classes: Classe[];
  eleves: Eleve[];
}

export async function exporterSauvegarde(): Promise<Sauvegarde> {
  const [classes, eleves] = await Promise.all([db.classes.toArray(), db.eleves.toArray()]);
  return {
    formatVersion: FORMAT_VERSION_SAUVEGARDE,
    exporteLe: new Date().toISOString(),
    classes,
    eleves,
  };
}

/** Valide la forme générale d'un fichier de sauvegarde sans vérifier chaque champ. */
export function analyserSauvegarde(donnees: unknown): Sauvegarde {
  if (typeof donnees !== 'object' || donnees === null) {
    throw new Error('Ce fichier ne contient pas une sauvegarde Clikards valide.');
  }
  const objet = donnees as Record<string, unknown>;

  if (objet.formatVersion !== FORMAT_VERSION_SAUVEGARDE) {
    throw new Error(
      `Format de sauvegarde non pris en charge (attendu : version ${FORMAT_VERSION_SAUVEGARDE}).`,
    );
  }
  if (!Array.isArray(objet.classes) || !Array.isArray(objet.eleves)) {
    throw new Error('Ce fichier ne contient pas une sauvegarde Clikards valide.');
  }

  return objet as unknown as Sauvegarde;
}

/** Remplace toutes les classes et élèves actuels par le contenu de la sauvegarde. */
export async function restaurerSauvegarde(sauvegarde: Sauvegarde): Promise<void> {
  await db.transaction('rw', db.classes, db.eleves, async () => {
    await db.classes.clear();
    await db.eleves.clear();
    if (sauvegarde.classes.length > 0) {
      await db.classes.bulkAdd(sauvegarde.classes);
    }
    if (sauvegarde.eleves.length > 0) {
      await db.eleves.bulkAdd(sauvegarde.eleves);
    }
  });
}

export function nomFichierSauvegarde(reference = new Date()): string {
  const date = reference.toISOString().slice(0, 10);
  return `clikards-sauvegarde-${date}.json`;
}
