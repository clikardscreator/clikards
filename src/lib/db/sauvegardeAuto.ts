import { writable } from 'svelte/store';
import { db } from './database';
import { exporterSauvegarde, nomFichierSauvegarde } from './sauvegarde';

interface OptionsPermissionFichier {
  mode?: 'read' | 'readwrite';
}

interface FlotEcritureFichier {
  write(donnees: string): Promise<void>;
  close(): Promise<void>;
}

interface PoigneeFichier {
  readonly name: string;
  queryPermission(options?: OptionsPermissionFichier): Promise<PermissionState>;
  requestPermission(options?: OptionsPermissionFichier): Promise<PermissionState>;
  createWritable(): Promise<FlotEcritureFichier>;
}

declare global {
  interface Window {
    showSaveFilePicker?(options?: {
      suggestedName?: string;
      types?: { description?: string; accept: Record<string, string[]> }[];
    }): Promise<PoigneeFichier>;
  }
}

const CLE_HANDLE = 'sauvegardeAutoHandle';
const DELAI_DEBOUNCE_MS = 2000;

export const supporteSauvegardeAuto =
  typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';

export interface EtatSauvegardeAuto {
  configuree: boolean;
  active: boolean;
  nomFichier: string | null;
  dernierEnregistrement: Date | null;
  erreur: string | null;
}

export const etatSauvegardeAuto = writable<EtatSauvegardeAuto>({
  configuree: false,
  active: false,
  nomFichier: null,
  dernierEnregistrement: null,
  erreur: null,
});

let poigneeActuelle: PoigneeFichier | null = null;
let minuteur: ReturnType<typeof setTimeout> | null = null;

async function ecrireMaintenant(): Promise<void> {
  if (!poigneeActuelle) return;
  try {
    const sauvegarde = await exporterSauvegarde();
    const flot = await poigneeActuelle.createWritable();
    await flot.write(JSON.stringify(sauvegarde, null, 2));
    await flot.close();
    etatSauvegardeAuto.update((etat) => ({
      ...etat,
      dernierEnregistrement: new Date(),
      erreur: null,
    }));
  } catch (e) {
    etatSauvegardeAuto.update((etat) => ({
      ...etat,
      erreur: e instanceof Error ? e.message : "Échec de l'écriture de la sauvegarde automatique.",
    }));
  }
}

/** À appeler au démarrage de l'application : reprend une configuration existante si possible. */
export async function initialiserSauvegardeAuto(): Promise<void> {
  if (!supporteSauvegardeAuto) return;

  const ligne = await db.reglages.get(CLE_HANDLE);
  const handle = ligne?.valeur as PoigneeFichier | undefined;
  if (!handle) return;

  poigneeActuelle = handle;
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  etatSauvegardeAuto.set({
    configuree: true,
    active: permission === 'granted',
    nomFichier: handle.name,
    dernierEnregistrement: null,
    erreur: null,
  });
}

/** Ouvre le sélecteur de fichier natif et active la sauvegarde automatique vers ce fichier. */
export async function activerSauvegardeAuto(): Promise<void> {
  if (!supporteSauvegardeAuto || !window.showSaveFilePicker) {
    throw new Error("La sauvegarde automatique n'est pas prise en charge par ce navigateur.");
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: nomFichierSauvegarde(),
    types: [
      {
        description: 'Sauvegarde Clikards',
        accept: { 'application/json': ['.json'] },
      },
    ],
  });

  await db.reglages.put({ cle: CLE_HANDLE, valeur: handle });
  poigneeActuelle = handle;
  etatSauvegardeAuto.set({
    configuree: true,
    active: true,
    nomFichier: handle.name,
    dernierEnregistrement: null,
    erreur: null,
  });

  await ecrireMaintenant();
}

/** Reconfirme l'autorisation d'écriture (nécessaire à chaque nouvelle session). */
export async function reactiverSauvegardeAuto(): Promise<void> {
  if (!poigneeActuelle) return;
  const permission = await poigneeActuelle.requestPermission({ mode: 'readwrite' });
  etatSauvegardeAuto.update((etat) => ({ ...etat, active: permission === 'granted' }));
  if (permission === 'granted') {
    await ecrireMaintenant();
  }
}

export async function desactiverSauvegardeAuto(): Promise<void> {
  await db.reglages.delete(CLE_HANDLE);
  poigneeActuelle = null;
  if (minuteur) {
    clearTimeout(minuteur);
    minuteur = null;
  }
  etatSauvegardeAuto.set({
    configuree: false,
    active: false,
    nomFichier: null,
    dernierEnregistrement: null,
    erreur: null,
  });
}

/** À appeler après toute modification des classes/élèves ; écrit après 2 s d'inactivité. */
export function signalerChangementDonnees(): void {
  if (!poigneeActuelle) return;
  if (minuteur) clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    void ecrireMaintenant();
  }, DELAI_DEBOUNCE_MS);
}
