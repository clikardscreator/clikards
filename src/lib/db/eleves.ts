import { db, NUMERO_CARTE_MAX, type Eleve } from './database';
import { analyserListeEleves } from '../eleves/analyseListe';
import { signalerChangementDonnees } from './sauvegardeAuto';

export async function listerElevesParClasse(classeId: string): Promise<Eleve[]> {
  const eleves = await db.eleves.where('classeId').equals(classeId).toArray();
  return eleves.sort((a, b) => a.numeroCarte - b.numeroCarte);
}

function prochainNumeroDisponible(numerosUtilises: Set<number>): number | null {
  for (let numero = 1; numero <= NUMERO_CARTE_MAX; numero += 1) {
    if (!numerosUtilises.has(numero)) return numero;
  }
  return null;
}

export async function ajouterEleve(donnees: {
  classeId: string;
  nom: string;
  prenom: string;
  numeroCarte?: number;
}): Promise<Eleve> {
  const elevesExistants = await listerElevesParClasse(donnees.classeId);
  const numerosUtilises = new Set(elevesExistants.map((eleve) => eleve.numeroCarte));

  let numeroCarte = donnees.numeroCarte;
  if (numeroCarte === undefined) {
    const prochain = prochainNumeroDisponible(numerosUtilises);
    if (prochain === null) {
      throw new Error(`Cette classe a déjà atteint le maximum de ${NUMERO_CARTE_MAX} cartes.`);
    }
    numeroCarte = prochain;
  } else if (numerosUtilises.has(numeroCarte)) {
    throw new Error(`Le numéro de carte ${numeroCarte} est déjà attribué dans cette classe.`);
  }

  const eleve: Eleve = {
    id: crypto.randomUUID(),
    classeId: donnees.classeId,
    nom: donnees.nom.trim(),
    prenom: donnees.prenom.trim(),
    numeroCarte,
    ordrePronote: elevesExistants.length,
  };
  await db.eleves.add(eleve);
  signalerChangementDonnees();
  return eleve;
}

export async function supprimerEleve(id: string): Promise<void> {
  await db.eleves.delete(id);
  signalerChangementDonnees();
}

export async function modifierNumeroCarte(id: string, numeroCarte: number): Promise<void> {
  if (!Number.isInteger(numeroCarte) || numeroCarte < 1 || numeroCarte > NUMERO_CARTE_MAX) {
    throw new Error(`Le numéro de carte doit être un entier entre 1 et ${NUMERO_CARTE_MAX}.`);
  }
  const eleve = await db.eleves.get(id);
  if (!eleve) return;

  const autres = await listerElevesParClasse(eleve.classeId);
  const conflit = autres.some((autre) => autre.id !== id && autre.numeroCarte === numeroCarte);
  if (conflit) {
    throw new Error(`Le numéro de carte ${numeroCarte} est déjà attribué dans cette classe.`);
  }

  await db.eleves.update(id, { numeroCarte });
  signalerChangementDonnees();
}

export interface ResultatImport {
  importes: number;
  ignores: number;
}

/** Importe une liste collée ; les numéros de carte libres sont attribués dans l'ordre. */
export async function importerElevesDepuisTexte(
  classeId: string,
  texte: string,
): Promise<ResultatImport> {
  const lignes = analyserListeEleves(texte);
  const elevesExistants = await listerElevesParClasse(classeId);
  const numerosUtilises = new Set(elevesExistants.map((eleve) => eleve.numeroCarte));
  let ordrePronote = elevesExistants.length;

  const aCreer: Eleve[] = [];

  for (const { nom, prenom } of lignes) {
    const numeroCarte = prochainNumeroDisponible(numerosUtilises);
    if (numeroCarte === null) break;

    numerosUtilises.add(numeroCarte);
    aCreer.push({
      id: crypto.randomUUID(),
      classeId,
      nom,
      prenom,
      numeroCarte,
      ordrePronote: ordrePronote++,
    });
  }

  if (aCreer.length > 0) {
    await db.eleves.bulkAdd(aCreer);
    signalerChangementDonnees();
  }

  return { importes: aCreer.length, ignores: lignes.length - aCreer.length };
}
