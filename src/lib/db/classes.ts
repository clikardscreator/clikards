import { db, type Classe, type Niveau } from './database';

/** Année scolaire par défaut : bascule au 1er août. */
export function anneeScolaireActuelle(reference = new Date()): string {
  const annee = reference.getFullYear();
  const debut = reference.getMonth() >= 7 ? annee : annee - 1;
  return `${debut}-${debut + 1}`;
}

export async function listerClasses(): Promise<Classe[]> {
  const classes = await db.classes.toArray();
  return classes.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function obtenirClasse(id: string): Promise<Classe | undefined> {
  return db.classes.get(id);
}

export async function creerClasse(donnees: {
  nom: string;
  niveau: Niveau;
  anneeScolaire: string;
}): Promise<Classe> {
  const classe: Classe = {
    id: crypto.randomUUID(),
    nom: donnees.nom.trim(),
    niveau: donnees.niveau,
    anneeScolaire: donnees.anneeScolaire.trim(),
    creeLe: Date.now(),
  };
  await db.classes.add(classe);
  return classe;
}

export async function supprimerClasse(id: string): Promise<void> {
  await db.transaction('rw', db.classes, db.eleves, async () => {
    await db.eleves.where('classeId').equals(id).delete();
    await db.classes.delete(id);
  });
}

export async function compterElevesParClasse(): Promise<Record<string, number>> {
  const eleves = await db.eleves.toArray();
  const compte: Record<string, number> = {};
  for (const eleve of eleves) {
    compte[eleve.classeId] = (compte[eleve.classeId] ?? 0) + 1;
  }
  return compte;
}
