import { chargerGoogleIdentityServices } from '../auth/google';

export interface FichierDrivePersonnel {
  id: string;
  nom: string;
  mimeType: string;
}

const URL_SCRIPT_API = 'https://apis.google.com/js/api.js';
/** Le moins intrusif (CLAUDE.md section 7, mode B) : accès limité aux fichiers choisis via le sélecteur. */
const PORTEE_DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';

let chargementPicker: Promise<void> | null = null;

/** Charge l'API Google (`gapi`) puis son module Picker, une seule fois. */
export function chargerApiPicker(): Promise<void> {
  if (window.google?.picker) {
    return Promise.resolve();
  }
  if (chargementPicker) {
    return chargementPicker;
  }

  chargementPicker = new Promise((resolve, reject) => {
    const chargerModulePicker = () => {
      window.gapi?.load('picker', () => resolve());
    };

    if (window.gapi) {
      chargerModulePicker();
      return;
    }

    const script = document.createElement('script');
    script.src = URL_SCRIPT_API;
    script.async = true;
    script.defer = true;
    script.onload = chargerModulePicker;
    script.onerror = () => {
      chargementPicker = null;
      reject(new Error("Impossible de charger l'API Google (apis.google.com)."));
    };
    document.head.appendChild(script);
  });

  return chargementPicker;
}

function clientIdRequis(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'Identifiant client OAuth non configuré (VITE_GOOGLE_CLIENT_ID dans .env.local). Voir docs/GOOGLE_SETUP.md.',
    );
  }
  return clientId;
}

/**
 * Demande à l'utilisateur d'autoriser l'accès à son Drive personnel (portée
 * `drive.file`, limitée aux fichiers qu'il choisira explicitement via le
 * sélecteur). Le jeton n'est jamais stocké : il reste en mémoire pour la
 * durée de l'import en cours (CLAUDE.md section 7 bis).
 */
/** Si Google ne répond pas dans ce délai, la fenêtre a probablement été bloquée par le navigateur. */
const DELAI_MAX_REPONSE_MS = 15000;

export async function demanderJetonDrive(): Promise<string> {
  const clientId = clientIdRequis();
  await chargerGoogleIdentityServices();

  return new Promise((resolve, reject) => {
    let reglee = false;
    const minuteur = setTimeout(() => {
      if (!reglee) {
        reglee = true;
        reject(
          new Error(
            "La fenêtre de connexion Google n'a pas répondu : elle a probablement été bloquée par le navigateur. Autorisez les popups pour ce site et réessayez.",
          ),
        );
      }
    }, DELAI_MAX_REPONSE_MS);

    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: PORTEE_DRIVE_FILE,
      callback: (reponse) => {
        if (reglee) return;
        reglee = true;
        clearTimeout(minuteur);
        if (reponse.access_token) {
          resolve(reponse.access_token);
        } else {
          reject(new Error(reponse.error_description ?? reponse.error ?? 'Accès refusé.'));
        }
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

/**
 * Ouvre le sélecteur Google Drive officiel, filtré sur les fichiers audio ou
 * image, et résout avec les fichiers choisis (liste vide si l'utilisateur
 * annule).
 */
export async function ouvrirSelecteurDrive(
  jeton: string,
  typeMime: 'audio' | 'image',
): Promise<FichierDrivePersonnel[]> {
  const cleApi = import.meta.env.VITE_GOOGLE_API_KEY;
  await chargerApiPicker();

  return new Promise((resolve, reject) => {
    const picker = window.google!.picker;
    try {
      const vue = new picker.DocsView(picker.ViewId.DOCS)
        .setMimeTypes(`${typeMime}/*`)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false);

      const constructeur = new picker.PickerBuilder()
        .addView(vue)
        .setOAuthToken(jeton)
        .enableFeature(picker.Feature.MULTISELECT_ENABLED)
        .setCallback(
          (donnees: {
            action: string;
            docs?: Array<{ id: string; name: string; mimeType: string }>;
          }) => {
            if (donnees.action === picker.Action.PICKED) {
              resolve(
                (donnees.docs ?? []).map((doc) => ({
                  id: doc.id,
                  nom: doc.name,
                  mimeType: doc.mimeType,
                })),
              );
            } else if (donnees.action === picker.Action.CANCEL) {
              resolve([]);
            }
          },
        );

      if (cleApi) {
        constructeur.setDeveloperKey(cleApi);
      }

      constructeur.build().setVisible(true);
    } catch (e) {
      reject(e instanceof Error ? e : new Error('Impossible d’ouvrir le sélecteur Google Drive.'));
    }
  });
}

/** Télécharge un fichier avec le jeton d'accès OAuth (pas la clé API, mode B). */
export async function telechargerFichierAvecJeton(idFichier: string, jeton: string): Promise<Blob> {
  const reponse = await fetch(`https://www.googleapis.com/drive/v3/files/${idFichier}?alt=media`, {
    headers: { Authorization: `Bearer ${jeton}` },
  });
  if (!reponse.ok) {
    throw new Error(`Téléchargement impossible (code ${reponse.status}).`);
  }
  return reponse.blob();
}
