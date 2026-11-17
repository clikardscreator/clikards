export interface ImageTrouvee {
  id: string;
  titre: string;
  url: string;
  miniature: string;
  licence: string;
  auteur?: string;
  pageOrigine: string;
}

export interface ResultatRecherche {
  images: ImageTrouvee[];
  total: number;
}

interface ResultatBrutOpenverse {
  id: string;
  title: string | null;
  url: string;
  thumbnail: string;
  license: string;
  creator?: string | null;
  foreign_landing_url: string;
}

interface ReponseBruteOpenverse {
  result_count: number;
  results: ResultatBrutOpenverse[];
}

const URL_RECHERCHE = 'https://api.openverse.org/v1/images/';
const TAILLE_PAGE = 20;

/**
 * Recherche d'images sous licence Creative Commons / domaine public via
 * l'API publique Openverse (pas de clé à créer, adapté à un usage
 * pédagogique). Voir docs/DECISIONS.md.
 */
export async function rechercherImages(requete: string, page = 1): Promise<ResultatRecherche> {
  const parametres = new URLSearchParams({
    q: requete,
    page: String(page),
    page_size: String(TAILLE_PAGE),
  });

  const reponse = await fetch(`${URL_RECHERCHE}?${parametres.toString()}`);
  if (!reponse.ok) {
    throw new Error(`Openverse a répondu avec le code ${reponse.status}`);
  }

  const donnees = (await reponse.json()) as ReponseBruteOpenverse;

  return {
    total: donnees.result_count,
    images: donnees.results.map((resultat) => ({
      id: resultat.id,
      titre: resultat.title ?? 'Sans titre',
      url: resultat.url,
      miniature: resultat.thumbnail,
      licence: resultat.license.toUpperCase(),
      auteur: resultat.creator ?? undefined,
      pageOrigine: resultat.foreign_landing_url,
    })),
  };
}

/** Texte d'attribution à conserver avec l'image (exigence des licences Creative Commons). */
export function texteAttribution(image: ImageTrouvee): string {
  const auteur = image.auteur ? `, par ${image.auteur}` : '';
  return `« ${image.titre} »${auteur}, licence ${image.licence} — ${image.pageOrigine}`;
}
