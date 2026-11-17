export interface FichierDrive {
  id: string;
  nom: string;
  mimeType: string;
  modifiedTime?: string;
}

const URL_BASE = 'https://www.googleapis.com/drive/v3/files';
const MOTIF_DOSSIER = /\/folders\/([a-zA-Z0-9_-]{10,})/;
const MOTIF_ID_SEUL = /^[a-zA-Z0-9_-]{10,}$/;

/**
 * Extrait l'identifiant d'un dossier à partir d'un lien de partage Google Drive
 * (ou de l'identifiant déjà isolé). Voir CLAUDE.md section 7, mode A.
 */
export function extraireIdDossier(lien: string): string | null {
  const texte = lien.trim();
  if (!texte) return null;

  const correspondance = texte.match(MOTIF_DOSSIER);
  if (correspondance) return correspondance[1];

  try {
    const url = new URL(texte);
    const id = url.searchParams.get('id');
    if (id) return id;
  } catch {
    // Pas une URL complète : peut-être l'identifiant déjà isolé, vérifié ci-dessous.
  }

  return MOTIF_ID_SEUL.test(texte) ? texte : null;
}

function cleApiRequise(): string {
  const cle = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!cle) {
    throw new Error(
      'Clé API Google non configurée (VITE_GOOGLE_API_KEY dans .env.local). Voir docs/GOOGLE_SETUP.md.',
    );
  }
  return cle;
}

/**
 * Construit un message d'erreur à partir de la réponse Google : son JSON
 * d'erreur (`error.message`) est bien plus précis qu'un simple code HTTP —
 * un 403 peut aussi bien signifier « API Drive non activée pour ce projet »,
 * « clé API invalide ou restreinte » ou « dossier non partagé publiquement »,
 * trois causes très différentes à ne pas confondre.
 */
async function erreurDepuisReponse(reponse: Response, contexte: string): Promise<Error> {
  try {
    const corps = (await reponse.json()) as { error?: { message?: string } };
    if (corps.error?.message) {
      return new Error(`${contexte} : ${corps.error.message}`);
    }
  } catch {
    // Corps non JSON ou vide : on retombe sur le code HTTP ci-dessous.
  }
  if (reponse.status === 404 || reponse.status === 403) {
    return new Error(
      `${contexte} (code ${reponse.status}). Vérifiez que l'API Google Drive est activée pour ` +
        'votre projet Google Cloud, que la clé API autorise cette API, et que le dossier est ' +
        'bien partagé « Tous les utilisateurs disposant du lien ». Voir docs/GOOGLE_SETUP.md.',
    );
  }
  return new Error(`${contexte} (code ${reponse.status}).`);
}

/** Liste les fichiers audio ou image d'un dossier Drive partagé « avec le lien ». */
export async function listerFichiersDossier(
  idDossier: string,
  typeMime: 'audio' | 'image',
): Promise<FichierDrive[]> {
  const cleApi = cleApiRequise();

  const parametres = new URLSearchParams({
    q: `'${idDossier}' in parents and mimeType contains '${typeMime}/' and trashed = false`,
    fields: 'files(id,name,mimeType,modifiedTime)',
    pageSize: '100',
    key: cleApi,
  });

  const reponse = await fetch(`${URL_BASE}?${parametres.toString()}`);
  if (!reponse.ok) {
    throw await erreurDepuisReponse(reponse, 'Impossible de lire ce dossier Google Drive');
  }

  const donnees = (await reponse.json()) as {
    files: Array<{ id: string; name: string; mimeType: string; modifiedTime?: string }>;
  };
  return donnees.files.map((fichier) => ({
    id: fichier.id,
    nom: fichier.name,
    mimeType: fichier.mimeType,
    modifiedTime: fichier.modifiedTime,
  }));
}

export async function telechargerFichierDrive(idFichier: string): Promise<Blob> {
  const cleApi = cleApiRequise();
  const reponse = await fetch(`${URL_BASE}/${idFichier}?alt=media&key=${cleApi}`);
  if (!reponse.ok) {
    throw await erreurDepuisReponse(reponse, 'Téléchargement impossible');
  }
  return reponse.blob();
}
