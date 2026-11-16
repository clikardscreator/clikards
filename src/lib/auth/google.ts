export interface ProfilCompte {
  sub: string;
  email: string;
  nom: string;
  photoUrl?: string;
}

interface JetonIdGoogle {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface ReponseIdentifiantGoogle {
  credential: string;
}

interface ServiceIdentiteGoogle {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (reponse: ReponseIdentifiantGoogle) => void;
        auto_select?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'small' | 'medium' | 'large';
          text?: 'signin_with' | 'signup_with' | 'continue_with';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          locale?: string;
        },
      ): void;
      disableAutoSelect(): void;
    };
  };
}

declare global {
  interface Window {
    google?: ServiceIdentiteGoogle;
  }
}

const URL_SCRIPT_GIS = 'https://accounts.google.com/gsi/client';

let chargementEnCours: Promise<void> | null = null;

/** Charge le script Google Identity Services une seule fois, à la demande (page /compte). */
export function chargerGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (chargementEnCours) {
    return chargementEnCours;
  }

  chargementEnCours = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = URL_SCRIPT_GIS;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      chargementEnCours = null;
      reject(new Error('Impossible de charger Google Identity Services.'));
    };
    document.head.appendChild(script);
  });

  return chargementEnCours;
}

function decoderJetonId(jeton: string): JetonIdGoogle {
  const partiePayload = jeton.split('.')[1];
  const base64 = partiePayload.replace(/-/g, '+').replace(/_/g, '/');
  const complet = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(atob(complet)) as JetonIdGoogle;
}

/** Extrait un profil affichable à partir du jeton d'identité renvoyé par Google (non vérifié : usage d'affichage uniquement, côté client). */
export function profilDepuisJetonId(jeton: string): ProfilCompte {
  const payload = decoderJetonId(jeton);
  return {
    sub: payload.sub,
    email: payload.email,
    nom: payload.name ?? payload.email,
    photoUrl: payload.picture,
  };
}
