export interface NomPrenom {
  nom: string;
  prenom: string;
}

/** Une lettre majuscule est considérée comme faisant partie du NOM (accents compris). */
const MOT_EST_EN_MAJUSCULES = /^[A-ZÀ-Ÿ](?:[A-ZÀ-Ÿ'-]*)$/;

/**
 * Analyse une ligne « NOM Prénom » copiée depuis Pronote (ou similaire).
 * Convention Pronote : le nom de famille est en MAJUSCULES, éventuellement
 * sur plusieurs mots (« DE LA FONTAINE Jean »), le prénom suit en casse
 * normale. Si la ligne contient une tabulation, elle est traitée comme un
 * CSV simple « NOM<tab>Prénom ».
 */
export function analyserLigneEleve(ligne: string): NomPrenom | null {
  const texte = ligne.trim();
  if (!texte) return null;

  if (texte.includes('\t')) {
    const [nom, prenom = ''] = texte.split('\t').map((partie) => partie.trim());
    if (!nom) return null;
    return { nom, prenom };
  }

  const mots = texte.split(/\s+/).filter(Boolean);
  if (mots.length === 0) return null;
  if (mots.length === 1) {
    return { nom: mots[0], prenom: '' };
  }

  let indiceCoupure = 0;
  while (indiceCoupure < mots.length - 1 && MOT_EST_EN_MAJUSCULES.test(mots[indiceCoupure])) {
    indiceCoupure += 1;
  }
  // Si aucun mot n'est reconnu en majuscules (ligne atypique), on retombe sur
  // la convention « premier mot = nom, reste = prénom ».
  if (indiceCoupure === 0) {
    indiceCoupure = 1;
  }

  return {
    nom: mots.slice(0, indiceCoupure).join(' '),
    prenom: mots.slice(indiceCoupure).join(' '),
  };
}

/** Analyse une liste collée (une ligne par élève), en ignorant les lignes vides. */
export function analyserListeEleves(texte: string): NomPrenom[] {
  return texte
    .split('\n')
    .map((ligne) => analyserLigneEleve(ligne))
    .filter((eleve): eleve is NomPrenom => eleve !== null);
}
