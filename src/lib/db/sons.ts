import { db, type Son } from './database';
import { signalerChangementDonnees } from './sauvegardeAuto';

export async function listerSons(): Promise<Son[]> {
  const sons = await db.sons.toArray();
  return sons.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
}

export async function obtenirSon(id: string): Promise<Son | undefined> {
  return db.sons.get(id);
}

function nettoyerTitre(nomFichier: string): string {
  return nomFichier.replace(/\.[a-z0-9]+$/i, '');
}

/** Importe un fichier audio choisi sur le disque de l'enseignant. */
export async function importerSonLocal(fichier: File): Promise<Son> {
  const son: Son = {
    id: crypto.randomUUID(),
    titre: nettoyerTitre(fichier.name),
    nomFichier: fichier.name,
    mime: fichier.type || 'audio/mpeg',
    blob: fichier,
    tags: [],
    importeLe: Date.now(),
  };
  await db.sons.add(son);
  signalerChangementDonnees();
  return son;
}

/** Met en cache un fichier téléchargé depuis un dossier Google Drive partagé par lien. */
export async function importerSonDepuisDrive(fichier: {
  nom: string;
  mime: string;
  blob: Blob;
  idDrive: string;
  dossierDrive?: string;
}): Promise<Son> {
  const son: Son = {
    id: crypto.randomUUID(),
    titre: nettoyerTitre(fichier.nom),
    nomFichier: fichier.nom,
    mime: fichier.mime,
    blob: fichier.blob,
    sourceDriveId: fichier.idDrive,
    dossierDrive: fichier.dossierDrive,
    tags: [],
    importeLe: Date.now(),
  };
  await db.sons.add(son);
  signalerChangementDonnees();
  return son;
}

export async function renommerSon(id: string, titre: string): Promise<void> {
  await db.sons.update(id, { titre: titre.trim() });
  signalerChangementDonnees();
}

export async function supprimerSon(id: string): Promise<void> {
  await db.sons.delete(id);
  signalerChangementDonnees();
}

export async function tailleTotaleCacheSons(): Promise<number> {
  const sons = await db.sons.toArray();
  return sons.reduce((total, son) => total + son.blob.size, 0);
}

export async function viderCacheSons(): Promise<void> {
  await db.sons.clear();
  signalerChangementDonnees();
}

export function formaterTailleOctets(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
