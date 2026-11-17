import { db, type Banque, type Question } from './database';
import { creerBanque } from './banques';
import { signalerChangementDonnees } from './sauvegardeAuto';

export const FORMAT_VERSION_BANQUE = 1;

export interface ExportBanque {
  formatVersion: typeof FORMAT_VERSION_BANQUE;
  exporteLe: string;
  banque: Pick<Banque, 'titre' | 'niveau' | 'tags' | 'auteur'>;
  questions: Array<Omit<Question, 'id' | 'banqueId'>>;
}

/**
 * Les images importées localement ou depuis Drive (`blob`) et le son associé
 * (`audio`, référence locale à la médiathèque) ne sont pas portables dans un
 * fichier JSON texte : ils sont retirés de l'export. Seules les images
 * distantes (`url`, ex. Openverse) survivent. Voir docs/DECISIONS.md.
 */
function questionExportable(question: Question): Omit<Question, 'id' | 'banqueId'> {
  const { id: _id, banqueId: _idBanque, images, audio: _audio, ...reste } = question;
  const imagesExportables = images?.filter((image) => Boolean(image.url));
  return {
    ...reste,
    images: imagesExportables && imagesExportables.length > 0 ? imagesExportables : undefined,
  };
}

export async function exporterBanque(banqueId: string): Promise<ExportBanque> {
  const banque = await db.banques.get(banqueId);
  if (!banque) {
    throw new Error('Banque introuvable.');
  }
  const questions = await db.questions.where('banqueId').equals(banqueId).toArray();
  questions.sort((a, b) => a.ordre - b.ordre);

  return {
    formatVersion: FORMAT_VERSION_BANQUE,
    exporteLe: new Date().toISOString(),
    banque: {
      titre: banque.titre,
      niveau: banque.niveau,
      tags: banque.tags,
      auteur: banque.auteur,
    },
    questions: questions.map(questionExportable),
  };
}

/** Valide la forme générale d'un fichier d'export de banque sans vérifier chaque champ. */
export function analyserExportBanque(donnees: unknown): ExportBanque {
  if (typeof donnees !== 'object' || donnees === null) {
    throw new Error('Ce fichier ne contient pas une banque Clikards valide.');
  }
  const objet = donnees as Record<string, unknown>;

  if (objet.formatVersion !== FORMAT_VERSION_BANQUE) {
    throw new Error(
      `Format de banque non pris en charge (attendu : version ${FORMAT_VERSION_BANQUE}).`,
    );
  }
  if (
    typeof objet.banque !== 'object' ||
    objet.banque === null ||
    !Array.isArray(objet.questions)
  ) {
    throw new Error('Ce fichier ne contient pas une banque Clikards valide.');
  }

  return objet as unknown as ExportBanque;
}

/** Importe une banque comme nouvelle banque (jamais de fusion ni d'écrasement). */
export async function importerBanque(exportBanque: ExportBanque): Promise<Banque> {
  const banque = await creerBanque({
    titre: exportBanque.banque.titre,
    niveau: exportBanque.banque.niveau,
    tags: exportBanque.banque.tags,
  });

  const questions = exportBanque.questions.map((question) => ({
    ...question,
    id: crypto.randomUUID(),
    banqueId: banque.id,
  }));
  if (questions.length > 0) {
    await db.questions.bulkAdd(questions);
  }
  signalerChangementDonnees();
  return banque;
}

function retirerDiacritiques(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function nomFichierBanque(titre: string): string {
  const normalise = retirerDiacritiques(titre.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `clikards-banque-${normalise || 'sans-titre'}.json`;
}
