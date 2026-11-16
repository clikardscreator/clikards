# Clikards — cartes-réponses pour la classe (alternative open source à Plickers)

> Fichier de cadrage pour Claude Code. À placer à la racine du dépôt GitHub sous le nom `CLAUDE.md`.
> Langue du projet : **français** (interface, commentaires, commits, documentation).

---

## 1. Contexte et objectif

Auteur : professeur d'éducation musicale en collège (REP+), formateur INSPE.

Objectif : créer une **application web de sondage en classe sans appareil élève**, sur le principe de Plickers :

- chaque élève dispose d'une **carte papier imprimée** portant un marqueur carré unique ;
- l'élève tient la carte dans l'une des **4 orientations** pour répondre A, B, C ou D ;
- l'enseignant **scanne la classe avec la caméra de son smartphone** ;
- les réponses s'affichent **en direct sur le vidéoprojecteur**.

Spécificités par rapport à Plickers :

1. **Questions sonores** : chaque question peut contenir un extrait audio (reconnaissance d'instrument, de timbre, de forme, de style, d'époque…), joué depuis l'écran projeté.
2. **Import de banques de sons depuis Google Drive** (dossiers d'extraits audio de l'enseignant).
3. **Import/export des banques de questions** (JSON, CSV) pour les partager entre collègues.
4. **Export des résultats compatible Pronote** (CSV/Excel à importer ou à coller dans le Client Pronote).
5. **Open source**, hébergé sur **GitHub**, déployé gratuitement sur **GitHub Pages**.
6. **Compte personnel par connexion Google** : l'enseignant se connecte avec son compte Google et retrouve ses banques, ses sons, ses classes et ses réglages sur tous ses appareils (ordinateur du collège, ordinateur perso, smartphone). Les données sont stockées dans **son propre Google Drive**, sans serveur tiers.

Nom de l'application : **Clikards** (dépôt GitHub `clikards`). Ne pas utiliser la marque « Plickers » dans le code, les visuels ni la communication.

Compte du projet : **clikards@gmail.com**, à utiliser comme propriétaire du projet Google Cloud, comme adresse d'assistance sur l'écran de consentement OAuth et comme contact dans le README et la page « À propos ». Ce compte ne sert pas à stocker de données utilisateur.

---

## 2. Contraintes structurantes

| Contrainte                                     | Conséquence technique                                                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hébergement GitHub Pages                       | Application **100 % statique** (pas de serveur applicatif).                                                                                                                                      |
| RGPD / données d'élèves mineurs                | **Aucune donnée nominative ne quitte l'appareil de l'enseignant.** Stockage local (IndexedDB). Pas d'analytics, pas de tracker.                                                                  |
| Usage en classe (réseau du collège peu fiable) | **PWA installable, fonctionnement hors ligne** une fois les sons mis en cache.                                                                                                                   |
| Smartphone milieu de gamme                     | Détection légère en JavaScript pur, pas d'OpenCV.js complet (~8 Mo).                                                                                                                             |
| Enseignant non développeur                     | Interface simple, peu de clics, gros boutons, tout en français.                                                                                                                                  |
| Compte personnel sans serveur                  | Identité = compte Google ; stockage = dossier caché de l'application dans le Drive de l'utilisateur (`appDataFolder`). Les données d'élèves sont **chiffrées côté navigateur** avant tout envoi. |

---

## 3. Stack technique

- **Vite + TypeScript** (mode strict).
- **Svelte** (ou Vue 3 si plus simple pour toi : décide une fois et documente dans `docs/DECISIONS.md`). Pas de framework lourd.
- **Dexie.js** pour IndexedDB (classes, élèves, questions, sessions, résultats, sons en cache).
- **js-aruco2** pour la détection des marqueurs (pure JS, gère l'orientation via l'ordre des coins).
- **PeerJS** (WebRTC) pour la liaison temps réel téléphone ↔ écran projeté, appairage par QR code.
- **jsPDF** (ou génération SVG → impression navigateur) pour les cartes imprimables A4.
- **SheetJS (xlsx)** pour l'export Excel ; CSV natif pour le reste.
- **Chart.js** pour les graphiques et courbes de suivi.
- **wavesurfer.js** (plugins _regions_, _timeline_) pour la forme d'onde et les marqueurs audio.
- **lamejs** (encodage MP3 dans un Web Worker) et **JSZip** pour l'export des extraits audio.
- **API YouTube IFrame Player** (domaine `youtube-nocookie.com`) pour les extraits vidéo.
- **Google Identity Services + Google Picker + Drive API v3** (appels REST côté client) pour la connexion au compte, la synchronisation et l'import des sons.
- **Web Crypto API** (AES-GCM 256 + PBKDF2) pour le chiffrement des données d'élèves avant synchronisation.
- **vite-plugin-pwa** (Workbox) pour le mode hors ligne.
- Tests : **Vitest** (unitaires) + **Playwright** (parcours principaux).
- Lint/format : ESLint + Prettier.

---

## 4. Architecture

```
┌──────────────────────┐   WebRTC (PeerJS)   ┌──────────────────────┐
│  Vue « Projection »  │◄───────────────────►│  Vue « Scanner »     │
│  (ordinateur + VP)   │   appairage par QR  │  (smartphone prof)   │
│  - affiche question  │                     │  - caméra            │
│  - joue l'audio      │                     │  - détection ArUco   │
│  - graphe en direct  │                     │  - envoie réponses   │
│  - base de données   │                     │  - liste qui a       │
│    maître (IndexedDB)│                     │    répondu / non     │
└──────────────────────┘                     └──────────────────────┘
```

- La **vue Projection** est la référence : elle stocke classes, questions, sessions et résultats.
- La **vue Scanner** est légère : elle reçoit la question en cours et la liste des numéros de cartes, puis renvoie des paires `{ numéroCarte, réponse }`. **Seuls des numéros transitent, jamais de noms.**
- **Mode dégradé sans liaison** : le scanner fonctionne seul ; les résultats sont exportés en JSON (ou QR code) puis importés dans la vue Projection.
- Le serveur public de signalisation PeerJS ne voit que des identifiants techniques. Prévoir dans les réglages la possibilité de configurer son propre serveur PeerJS.

- **Synchronisation compte** : la base locale (IndexedDB) reste la source de travail (rapide, hors ligne) ; elle est synchronisée avec le Drive de l'utilisateur quand une connexion est disponible (voir section 7 bis).

### Routes

- `/` accueil : choisir « Projection » ou « Scanner » ; bouton « Se connecter avec Google » et état de synchronisation.
- `/compte` profil, synchronisation, clé d'accès (passkey), ajout d'un appareil par QR code, fiche de récupération, déconnexion.
- `/classes` gestion des classes et attribution des cartes.
- `/banques` banques de questions (création, import, export).
- `/sons` médiathèque : sons (import Google Drive, cache local) et vidéos YouTube (liens, extraits, marqueurs).
- `/session/:id` diffusion en classe (vue Projection).
- `/scan` vue Scanner.
- `/resultats` historique et exports.
- `/cartes` génération des cartes à imprimer.
- `/reglages`.

---

## 5. Modèle de données (Dexie)

```ts
Classe      { id, nom, niveau /* 6e…3e */, anneeScolaire, creeLe }
Eleve       { id, classeId, nom, prenom, numeroCarte /* 1..63 */, ordrePronote }
Banque      { id, titre, niveau?, tags[], auteur?, version, creeLe, modifieLe }
Question    { id, banqueId, ordre, enonce, type /* 'qcm' | 'vraifaux' | 'sondage' */,
              choix: [{ lettre: 'A'|'B'|'C'|'D', texte, image? }],
              bonneReponse?: 'A'|'B'|'C'|'D' /* absent pour un sondage */,
              video?: { videoId, debut?: number, fin?: number, lectureAuto: boolean,
                        marqueurIds?: string[] } /* une question a un son OU une vidéo */,
              audio?: { sonId, debut?: number, fin?: number, lectureAuto: boolean,
                        marqueurIds?: string[] /* marqueurs du son proposés pour cette question */ },
              competence?: string, image?, coefficient?: number /* 1 par défaut */,
              notee: boolean /* false pour un sondage ou une question d'échauffement */ }
Son         { id, titre, sourceDriveId?, nomFichier, mime, dureeSec?, blob? /* cache local */,
              dossierDrive?, tags[], importeLe,
              marqueurs: [{ id, libelle /* ex. "Entrée des cuivres" */, temps: number /* s */,
                            couleur?, fin?: number }] }
Video       { id, titre, youtubeId, urlOrigine, dureeSec?, miniatureUrl?, tags[], ajouteLe,
              marqueurs: [{ id, libelle, temps: number, couleur?, fin?: number }] }
Session     { id, classeId, banqueId, date, statut,
              mode: 'entrainement' | 'evaluation',
              notation: { type: 'note' | 'pourcentage', bareme?: number /* 20 par défaut */,
                          arrondi?: 0.1 | 0.25 | 0.5 | 1, nonReponse: 'zero' | 'exclue' } }
Reponse     { id, sessionId, questionId, eleveId, numeroCarte, lettre, horodatage }
Compte      { googleSub, email, nom, photoUrl, derniereSynchro, passkeyCredentialId?, cleEnveloppee? }
SyncMeta    { table, idLocal, idDrive?, modifieLe, version, supprime /* tombstone */ }
```

- Tous les enregistrements portent `modifieLe` (horodatage) et `version` pour la résolution des conflits de synchronisation.
- Utiliser des identifiants **UUID** (pas d'auto-incrément) pour éviter les collisions entre appareils.

- `numeroCarte` va de 1 à 63 (une classe ne dépasse jamais cette taille).
- Une même carte peut servir dans plusieurs classes : l'attribution se fait par classe.

---

## 6. Cartes et détection

### Génération des cartes (`/cartes`)

- Dictionnaire de marqueurs choisi pour **robustesse et grande distance** (lecture à 6–8 m) : privilégier peu de bits, par exemple ARUCO 4x4 ou ARUCO_MIP_36h12 selon ce qu'offre js-aruco2. Tester et documenter le choix.
- Une carte par page A4, ou 2 par page. Le marqueur occupe le maximum de surface.
- Sur chaque bord, en petit : la lettre (A en haut, B à droite, C en bas, D à gauche) et le numéro de carte. Les lettres doivent être assez petites pour rester discrètes pour les voisins.
- Option « avec prénom » (impression locale uniquement).

### Détection (`/scan`)

- `getUserMedia` caméra arrière, résolution maximale disponible, détection sur `requestAnimationFrame` toutes les ~100 ms (Web Worker si besoin).
- Pour chaque marqueur : id → numéro de carte ; orientation (rotation du coin 0) → lettre.
- **Stabilisation** : ne valider une réponse qu'après N détections identiques consécutives (N = 3 par défaut, réglable). Un changement de réponse est accepté et écrase le précédent.
- Retour visuel en surimpression : contour vert sur les cartes lues, compteur `répondu / total`, liste des numéros manquants.
- Retour à chaque nouvelle carte : vibration courte **si disponible** (Android), sinon bip court et flash vert à l'écran (iPhone : Safari ne gère pas la vibration).
- Écran maintenu allumé pendant le scan (Screen Wake Lock API).

### Web app d'abord, application native seulement si nécessaire

- Le scanner est une **web app (PWA)** : pas d'application native en v1.
- **Isoler** l'accès caméra (`src/lib/camera/`) et la détection (`src/lib/detection/`) derrière des interfaces TypeScript simples, sans dépendance à l'interface, pour pouvoir emballer l'application avec **Capacitor** (Android/iOS) plus tard sans réécriture.
- Passer à Capacitor uniquement si le test de terrain du jalon 1 montre une lecture à distance insuffisante (besoin de zoom, de mise au point manuelle, de lampe ou de vibration sur iPhone).
- Ignorer les ids qui ne sont pas dans la classe active.

### Tests de détection

- Fournir des images de test (`tests/fixtures/`) : cartes à différentes distances, angles et éclairages, et vérifier id et orientation en test unitaire.

---

## 7. Questions sonores, vidéos YouTube et import Google Drive

### Lecture audio (vue Projection)

- Lecteur intégré à la question : lecture, pause, relecture, barre de progression, volume.
- Prise en charge de `debut` / `fin` pour jouer un extrait précis d'un fichier long.
- Option « lecture automatique à l'affichage ».

### Marqueurs dans les fichiers audio

Objectif : pouvoir démarrer l'écoute à différents endroits d'un même fichier (ex. « thème A », « entrée des cuivres », « réexposition ») sans chercher à la main.

- **Éditeur de marqueurs** (page `/sons`, fiche d'un son) : affichage de la **forme d'onde** (wavesurfer.js avec ses plugins _regions_ et _timeline_), lecture, ajout d'un marqueur à la position courante (bouton ou touche `M`), placement précis par glisser ou saisie `mm:ss.s`, libellé, couleur, fin optionnelle (le marqueur devient alors une zone).
- Les marqueurs sont **attachés au son** (réutilisables dans toutes les questions qui l'utilisent) ; une question choisit quels marqueurs afficher (`marqueurIds`), et dans quel ordre.
- **En classe (vue Projection)** : les marqueurs apparaissent comme des boutons sous le lecteur et comme des repères sur la barre de progression. Clic = lecture depuis ce point. Raccourcis : touches `1` à `9` pour les 9 premiers marqueurs, `0` pour revenir au début de l'extrait.
- Option par marqueur : « s'arrêter à la fin de la zone » ou « continuer la lecture ».
- Option d'affichage : masquer les libellés aux élèves (afficher « Repère 1, 2, 3… ») pour ne pas donner la réponse.
- Les marqueurs sont synchronisés avec le compte (`sons/index.json`) et inclus dans l'export/import des banques.
- Si le fichier Drive est remplacé (durée différente), avertir que les marqueurs peuvent être décalés.

### Export de la sélection audio

Objectif : enregistrer **un passage choisi** d'un fichier audio comme un nouveau fichier, pour le réutiliser ailleurs (ENT, clé USB, autre logiciel, partage avec un collègue) ou pour alléger la médiathèque.

- **Sélection à exporter** : zone tracée à la souris sur la forme d'onde, extrait `debut`/`fin` d'une question, ou zone d'un marqueur. Affichage de la durée de la sélection.
- **Export groupé** : « Exporter toutes les zones de marqueurs » → un fichier par zone (archive ZIP via JSZip).
- **Options** :
  - format : **MP3** (par défaut, 128/192/256 kbit/s), **WAV** (qualité d'origine), OGG/Opus si le navigateur le permet ;
  - fondu d'entrée et de sortie (0 à 3 s, 0,5 s par défaut pour éviter les clics) ;
  - normalisation du volume (optionnelle) ;
  - mono ou stéréo.
- **Traitement 100 % dans le navigateur** : décodage par Web Audio API (`decodeAudioData`), découpe des échantillons, fondus et normalisation dans un `OfflineAudioContext`, encodage WAV natif et MP3 par **lamejs** dans un Web Worker (barre de progression, interface non bloquée).
- **Nom de fichier proposé** : `<titre du son> - <libellé du marqueur> (mm.ss-mm.ss).mp3`, modifiable.
- **Destinations** (au choix) :
  - téléchargement sur l'appareil ;
  - **enregistrement dans Google Drive** (scope `drive.file`, dossier choisi via le Picker, `Clikards/Extraits` par défaut) ;
  - **ajout à la médiathèque** comme nouveau son ; les marqueurs compris dans la sélection sont recopiés et recalés sur le nouveau début.
- Métadonnées ID3 pour le MP3 (titre, commentaire « Extrait de … de mm:ss à mm:ss »).
- Limite : avertir au-delà de 20 min de sélection (mémoire sur smartphone).
- **Non disponible pour les vidéos YouTube** (téléchargement interdit par les conditions d'utilisation de YouTube).
- Rappel discret dans l'interface : les extraits d'œuvres protégées sont destinés à un usage pédagogique en classe (exception pédagogique), pas à une diffusion publique.
- Formats : mp3, m4a/aac, ogg, wav, flac (selon le navigateur ; avertir si non pris en charge).

### Import depuis Google Drive (`/sons`)

Mettre en œuvre **les deux modes**, dans cet ordre :

**Mode A : dossier partagé par lien (sans connexion Google)**

- L'enseignant colle l'URL d'un dossier Drive partagé en « Tous les utilisateurs disposant du lien ».
- Appel `files.list` avec une **clé API** (restreinte au domaine GitHub Pages) :
  `q = "'<folderId>' in parents and mimeType contains 'audio/' and trashed = false"`.
- Sous-dossiers parcourus récursivement (profondeur 3 max). Chaque sous-dossier devient un tag (ex. `Instruments/Cuivres`).
- Téléchargement : `files.get?alt=media`.

**Mode B : Drive personnel (OAuth)**

- Google Identity Services (modèle par jeton, côté client) + **Google Picker** pour choisir des fichiers ou un dossier.
- Scope de départ : `drive.file` (le moins intrusif). Si la sélection d'un dossier ne donne pas accès à son contenu avec ce scope, passer à `drive.readonly` en laissant l'application Google Cloud en **mode test** (usage personnel, utilisateurs de test déclarés). Documenter le choix retenu.
- Ne jamais stocker de jeton d'accès de façon persistante.

**Commun aux deux modes**

- Prévisualisation avant import : liste des fichiers, durée, case à cocher, tags.
- **Mise en cache locale** (Blob dans IndexedDB) pour jouer les sons hors ligne en classe. Afficher l'espace utilisé et permettre de vider le cache.
- Bouton « Resynchroniser » : détecte les nouveaux fichiers ou les fichiers modifiés (`modifiedTime`, `md5Checksum`).
- Optionnel : un fichier `banque.json` présent dans le dossier Drive est lu comme métadonnées (titres, tags, questions associées).
- Les identifiants Google (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`) passent par des variables d'environnement et des secrets GitHub Actions. Fournir `.env.example` et un guide pas à pas `docs/GOOGLE_SETUP.md` (création du projet Google Cloud, activation des API Drive et Picker, écran de consentement, origines autorisées = URL GitHub Pages + `http://localhost:5173`).

---

## 7 bis. Compte personnel via Google

### Connexion

- Bouton « Se connecter avec Google » (Google Identity Services, bouton officiel).
- Récupération du profil (nom, e-mail, photo) pour l'affichage dans l'en-tête.
- **Modèle par jeton côté client** (pas de serveur) : demander les scopes au moment où ils sont utiles (autorisation progressive) :
  - `openid email profile` à la connexion ;
  - `drive.appdata` pour la synchronisation du compte (dossier caché réservé à l'application, invisible dans le Drive de l'utilisateur, scope non restreint) ;
  - `drive.file` / `drive.readonly` uniquement quand l'utilisateur importe des sons (section 7).
- Renouvellement silencieux du jeton quand c'est possible ; sinon, petite bannière « Reconnectez-vous pour synchroniser » **sans bloquer l'usage hors ligne**.
- Le jeton d'accès reste en mémoire uniquement (jamais dans localStorage ni IndexedDB).
- **L'application reste utilisable sans compte** (mode local seul) : la connexion apporte la synchronisation multi-appareils et la sauvegarde.
- Déconnexion : bouton dans `/compte` ; option « Déconnecter et effacer les données de cet appareil » (indispensable sur un ordinateur partagé du collège).

### Stockage dans le Drive de l'utilisateur

- Dossier `appDataFolder` contenant :
  - `profil.json` (réglages, préférences d'affichage) ;
  - `banques/<uuid>.json` (banques de questions) ;
  - `sons/index.json` (références vers les fichiers audio du Drive : `driveFileId`, titre, tags, extrait début/fin ; les fichiers audio eux-mêmes ne sont **pas** dupliqués) ;
  - `videos/index.json` (vidéos YouTube : identifiant, titre, tags, marqueurs) ;
  - `classes.enc` (classes, élèves, attributions de cartes, **chiffré**) ;
  - `resultats/<annee>/<sessionId>.enc` (résultats, **chiffré**).
- Respecter les quotas de l'API (requêtes groupées, envoi différé de 2 s après la dernière modification).

### Chiffrement des données d'élèves (sans phrase secrète)

Exigence : chiffrement transparent, **aucune phrase secrète à saisir ni à retenir**.

- **Clé de chiffrement générée automatiquement** par le navigateur au premier usage (AES-GCM 256, `crypto.subtle.generateKey`), stockée dans IndexedDB comme clé **non extractible** pour l'usage courant. Chaque fichier `.enc` est chiffré avec cette clé avant envoi sur le Drive.
- **Interdit** : stocker la clé en clair dans le Drive à côté des données (le chiffrement ne servirait à rien).
- **Ajout d'un nouvel appareil, par ordre de priorité :**
  1. **Clé d'accès (passkey) avec extension WebAuthn PRF** : l'enseignant déverrouille avec son empreinte, son visage ou le code de l'appareil (Windows Hello, Touch ID, Android). La sortie PRF sert à envelopper (_wrap_) la clé de chiffrement ; seule la version enveloppée est stockée dans `appDataFolder`. Les passkeys synchronisées (Gestionnaire de mots de passe Google, trousseau iCloud) permettent de retrouver les classes sur un autre appareil sans rien taper.
  2. **Appairage par QR code** depuis un appareil déjà configuré : l'appareil existant affiche un QR code, le nouveau le scanne et la clé est transmise par la liaison chiffrée WebRTC (PeerJS, déjà utilisée pour le scanner). C'est la solution de repli si PRF n'est pas pris en charge.
- **Fiche de récupération** (fortement recommandée, proposée à la première synchronisation) : PDF à imprimer avec un QR code de secours contenant la clé, à ranger chez soi. Sans passkey, sans autre appareil et sans fiche, les données d'élèves sur le Drive sont irrécupérables (les banques et les sons restent accessibles). Le dire clairement, une seule fois, à la configuration.
- Détecter la prise en charge de PRF (`getClientExtensionResults().prf`) et adapter le parcours automatiquement ; documenter la compatibilité navigateurs dans `docs/DECISIONS.md`.
- Tests unitaires : chiffrement/déchiffrement, enveloppement/désenveloppement de clé, refus d'un fichier altéré (échec de l'authentification GCM).
- Alternative proposée dans les réglages : « Ne jamais synchroniser les élèves et les résultats » (ils restent sur l'appareil, seules les banques et les réglages sont synchronisés).

### Synchronisation

- Au démarrage (si connecté), puis après chaque modification (avec délai), puis toutes les 5 min.
- Fusion par enregistrement : **la modification la plus récente gagne** (`modifieLe`) ; suppressions propagées par marqueurs (`supprime: true`), purgés après 90 jours.
- Indicateur d'état dans l'en-tête : ✓ synchronisé · ↻ en cours · ⚠ hors ligne (modifications en attente) · ✕ erreur (avec détail).
- Bouton « Synchroniser maintenant » et journal des dernières synchronisations dans `/compte`.
- Le **téléphone en mode Scanner n'a pas besoin d'être connecté** au compte : il reçoit tout via la liaison PeerJS. La connexion sur le téléphone reste possible pour préparer ou consulter.

### Partage entre collègues (optionnel, après la v1)

- « Partager une banque » : export d'un fichier JSON dans un dossier visible du Drive (scope `drive.file`) puis partage via l'interface Google habituelle ; import d'une banque partagée par lien.

### Extraits vidéo YouTube

Objectif : illustrer ou poser une question à partir d'une vidéo YouTube (concert, clip, documentaire, extrait d'opéra…) en ne jouant **que le passage choisi**.

**Ajout d'une vidéo** (médiathèque `/sons`, onglet « Vidéos »)

- L'enseignant **colle le lien de partage** YouTube. Formats à reconnaître : `youtu.be/ID`, `youtu.be/ID?t=83`, `youtube.com/watch?v=ID&t=1m23s`, `youtube.com/shorts/ID`, `youtube.com/embed/ID`, `m.youtube.com/…`, avec ou sans paramètres de suivi (`si=`, `feature=`…). Extraire l'identifiant (11 caractères) et, s'il est présent, le temps `t` comme début proposé.
- Récupérer titre et miniature via l'oEmbed YouTube (`https://www.youtube.com/oembed?url=…&format=json`, sans clé API) ; la durée via `player.getDuration()` une fois le lecteur chargé.
- Message clair si la vidéo est privée, supprimée ou non intégrable (erreurs 100, 101, 150 de l'API).

**Choix du début et de la fin de l'extrait**

- Aperçu de la vidéo dans l'éditeur ; boutons « Début = position actuelle » et « Fin = position actuelle » ; saisie précise `mm:ss.s` ; boutons de réglage fin (−1 s / −0,1 s / +0,1 s / +1 s).
- Bouton « Tester l'extrait » (lecture du début à la fin) et option « en boucle ».
- **Marqueurs** comme pour les sons (section précédente) : repères nommés, touches `1`–`9` en classe, option « masquer les libellés ».
- Un même lien peut servir à plusieurs questions avec des extraits différents (début/fin stockés dans la question, marqueurs dans la vidéo).

**Lecture en classe (vue Projection)**

- Lecteur intégré via l'**API IFrame Player** en mode confidentialité renforcée (`youtube-nocookie.com`), paramètres : `controls=0` (contrôles propres à l'application), `rel=0`, `modestbranding=1`, `playsinline=1`, `iv_load_policy=3`.
- Démarrage par `seekTo(debut, true)` puis `playVideo()` ; **arrêt automatique à la fin** par une vérification de `getCurrentTime()` toutes les 100 ms (les paramètres `start`/`end` de YouTube n'acceptent que des secondes entières : ne pas s'y fier seuls).
- Contrôles de l'application : lecture/pause, rejouer l'extrait, marqueurs, volume, plein écran de la vidéo. Option « lecture automatique à l'affichage ».
- La vidéo peut occuper tout l'écran pendant la lecture puis laisser place à la question et aux choix A/B/C/D.
- Rappel dans l'interface : le début d'un extrait peut être décalé de quelques dixièmes de seconde selon la vidéo (positionnement de YouTube) ; prévoir une petite marge.

**Contraintes à respecter**

- **Connexion internet indispensable** : les vidéos YouTube ne peuvent pas être mises en cache. Avant une séance, vérifier les vidéos de la banque et afficher un avertissement si le réseau est absent ; la question reste utilisable sans la vidéo.
- Ne pas télécharger, extraire l'audio ni masquer entièrement le lecteur : c'est contraire aux conditions d'utilisation de YouTube. Pour une écoute « à l'aveugle », utiliser un fichier audio du Drive.
- Des publicités peuvent apparaître sur certaines vidéos : le signaler dans le guide enseignant.
- Mettre à jour la Content-Security-Policy : `frame-src https://www.youtube-nocookie.com`, `script-src https://www.youtube.com` (script de l'API), `img-src https://i.ytimg.com`, `connect-src https://www.youtube.com` (oEmbed).
- Les liens vidéo, extraits et marqueurs sont inclus dans l'export/import des banques et dans la synchronisation du compte.

---

## 8. Banques de questions

- Éditeur simple : énoncé, 2 à 4 choix, bonne réponse, son associé (sélecteur dans la banque de sons), image optionnelle, compétence visée.
- Import/export **JSON** (format complet, versionné : `"formatVersion": 1`) et **CSV** (simple, éditable dans un tableur).
- Un fichier exemple `exemples/banque-timbres-6e.json` (questions de démonstration sans son protégé).
- Duplication d'une banque, réordonnancement par glisser-déposer.

---

## 9. Diffusion en classe (vue Projection)

1. Choisir la classe, la banque et le **mode** :
   - **Entraînement** : correction affichée après chaque question, pas de note enregistrée (les réponses restent dans le suivi) ;
   - **Évaluation** : bonne réponse non révélée pendant la série (option), **note ou pourcentage calculé à la fin de la série**.
     Puis « Démarrer ». Un QR code d'appairage s'affiche pour le téléphone.
2. Pour chaque question : affichage plein écran (gros caractères, lisible au fond de la salle), lecture du son, phase de scan.
3. Pendant le scan : grille des numéros de cartes (anonyme : numéros seulement, pas de noms à l'écran), qui se colorent quand une réponse est reçue.
4. « Révéler » : histogramme A/B/C/D, bonne réponse mise en évidence, pourcentage de réussite.
5. Navigation : question suivante / précédente, rejouer une question.
6. Raccourcis clavier : `Espace` lecture/pause, `→` suivante, `R` révéler, `F` plein écran, `1`–`9` marqueurs audio.
7. **Fin de série** : écran récapitulatif (moyenne de la classe, histogramme des résultats, question la plus échouée) ; détail individuel sur l'écran de l'enseignant uniquement (jamais projeté par défaut).

### Notation d'une série (évaluation)

- Choix au lancement de la session (valeur par défaut réglable dans `/reglages`) entre :
  - **Note** sur un barème (20 par défaut ; 10, 5 ou personnalisé) ;
  - **Pourcentage de bonnes réponses**.
- Le choix reste **modifiable après coup** dans les résultats (recalcul instantané, les réponses brutes sont conservées).
- Calcul : somme des coefficients des questions réussies / somme des coefficients des questions notées. Les questions `notee: false` (sondages, échauffement) sont exclues.
- Réglages : arrondi (0,1 / 0,25 / 0,5 / 1), traitement d'une **absence de réponse** (compte zéro ou question exclue pour cet élève), élève **absent** à toute la série (marqué « Abs », exporté tel quel pour Pronote).

---

## 10. Résultats et export Pronote

- Tableau par session : élèves en lignes, questions en colonnes, score final (note ou pourcentage selon le choix de la session, bascule possible).

### Suivi des résultats (`/resultats`)

Plusieurs modes d'affichage, choisis par onglets, avec les mêmes filtres partout : classe, élève, période (trimestre/semestre/dates), banque, compétence, mode (entraînement/évaluation).

- **Tableaux**
  - Classe × sessions (moyenne par élève, moyenne de classe en bas), tri par colonne.
  - Élève × questions (détail des réponses, bonnes en vert, fausses en rouge, sans réponse en gris).
  - **Carte de chaleur** élèves × compétences (taux de réussite en dégradé de couleurs).
- **Graphiques**
  - Histogramme de la répartition des notes d'une session.
  - Barres par question (taux de réussite) pour repérer les notions à retravailler.
  - Barres par compétence pour une classe ou un élève.
  - Radar des compétences d'un élève (optionnel).
- **Courbes**
  - Évolution d'un élève dans le temps (notes ou pourcentages), avec la moyenne de la classe en pointillé pour comparaison.
  - Évolution de la moyenne de la classe ; comparaison de plusieurs classes d'un même niveau.
  - Courbe de progression par compétence.
- **Fiche élève** : synthèse imprimable (courbe + compétences + dernières évaluations), utile pour un conseil de classe ou une rencontre parents-professeurs.
- Bibliothèque : **Chart.js** (léger, accessible) ; couleurs lisibles en cas de daltonisme ; tout graphique exportable en PNG et chaque vue imprimable / exportable en PDF.
- **Anonymat à l'écran** : bouton « Mode projection » qui remplace les noms par les numéros de carte avant tout affichage au tableau.
- Calculs faits uniquement côté navigateur à partir des réponses brutes (aucun stockage de statistiques figées, tout est recalculable).

### Export

- **Export Pronote** :
  - CSV (séparateur `;`, encodage UTF-8 avec BOM pour Excel) et XLSX.
  - Colonnes : `NOM ; Prénom ; Note` (note sur le barème choisi, ou pourcentage converti sur 20 si nécessaire), puis une colonne par question en option.
  - Élèves **triés dans l'ordre alphabétique de Pronote** (champ `ordrePronote`, réglable) pour permettre un copier-coller direct de la colonne de notes dans la grille d'un devoir.
  - Variante « compétences » : niveau 1 à 4 (Maîtrise insuffisante / fragile / satisfaisante / très bonne), avec seuils réglables.
- Export JSON complet (sauvegarde) et import (restauration ou changement d'ordinateur).
- **Import des élèves** : coller une liste « NOM Prénom » copiée depuis Pronote, ou importer un CSV. Les numéros de carte sont attribués automatiquement dans l'ordre.

---

## 11. RGPD et sécurité

- Aucune donnée nominative envoyée à un serveur tiers. Si l'enseignant active la synchronisation des classes, les données d'élèves vont dans **son** Drive, **chiffrées dans le navigateur** : Google ne peut pas les lire.
- Mentionner dans l'interface et dans `docs/RGPD.md` que l'usage d'un compte Google personnel pour des données d'élèves doit être conforme aux consignes de l'établissement et de l'académie ; le mode « élèves non synchronisés » est la solution de repli.
- Page `/reglages` : export complet des données, suppression de toutes les données, mentions d'information.
- Fichier `docs/RGPD.md` : registre simplifié (finalité, données, durée de conservation = année scolaire, lieu de stockage = appareil de l'enseignant).
- Content-Security-Policy stricte (autoriser uniquement les domaines Google nécessaires, les domaines YouTube listés en section 7 et le serveur PeerJS).
- Pas de dépendance chargée depuis un CDN à l'exécution (tout est empaqueté), sauf les scripts Google obligatoires.

---

## 12. Structure du dépôt

```
clikards/
├── CLAUDE.md
├── README.md                 # présentation, captures, démarrage rapide (en français)
├── LICENSE                   # AGPL-3.0 (ou MIT : à confirmer avec l'auteur)
├── .env.example
├── .github/workflows/
│   ├── ci.yml                # lint + tests sur chaque PR
│   └── deploy.yml            # build + déploiement GitHub Pages sur main
├── docs/
│   ├── DECISIONS.md          # journal des choix techniques
│   ├── GOOGLE_SETUP.md
│   ├── RGPD.md
│   └── GUIDE_ENSEIGNANT.md   # mode d'emploi illustré
├── exemples/
├── public/                   # icônes PWA, manifest
├── src/
│   ├── lib/db/               # Dexie : schéma, migrations
│   ├── lib/camera/           # accès caméra isolé (remplaçable par Capacitor)
│   ├── lib/detection/        # wrapper js-aruco2, stabilisation, orientation
│   ├── lib/notation/         # calcul note / pourcentage, coefficients, arrondis
│   ├── lib/stats/            # agrégations pour le suivi (tableaux, graphiques, courbes)
│   ├── lib/liaison/          # PeerJS : appairage, messages typés
│   ├── lib/auth/             # Google Identity Services, jetons, scopes progressifs
│   ├── lib/sync/             # synchronisation appDataFolder, fusion, file d'attente hors ligne
│   ├── lib/crypto/           # dérivation de clé, chiffrement AES-GCM
│   ├── lib/drive/            # import des sons : lien public + OAuth/Picker
│   ├── lib/audio/            # lecteur, extraits début/fin, marqueurs, découpe et export (WAV/MP3)
│   ├── lib/video/            # analyse des liens YouTube, lecteur IFrame, extraits
│   ├── lib/export/           # CSV, XLSX, Pronote, JSON
│   ├── lib/cartes/           # génération PDF/SVG
│   ├── routes/               # pages
│   └── components/
└── tests/
    ├── unit/
    ├── e2e/
    └── fixtures/
```

- `vite.config.ts` : `base: '/clikards/'` pour GitHub Pages ; routage par hash (`#/…`) ou fallback `404.html` pour éviter les 404 au rechargement.

---

## 13. Feuille de route (à suivre dans l'ordre)

**Jalon 0 : socle**

- Initialiser Vite + TS + framework, ESLint/Prettier, Vitest, PWA, workflows CI et déploiement Pages.
- Page d'accueil déployée et accessible en ligne.

**Jalon 1 : cartes + détection (cœur du projet)**

- Génération et impression des cartes.
- Vue Scanner seule : détection, orientation, stabilisation, compteur.
- Tests sur images.
- **Test de terrain obligatoire avant le jalon 2** : smartphone de l'enseignant, dans sa salle, 30 cartes tenues par des élèves (ou posées sur les tables) du fond de la salle. Critères : 30 cartes lues en moins de 10 s, aucune erreur d'orientation. Noter le résultat (modèle de téléphone, distance, éclairage) dans `docs/DECISIONS.md`.
- Si le test échoue malgré les réglages (dictionnaire de marqueurs, taille des cartes, résolution) : proposer l'emballage Capacitor **avant** de poursuivre.

**Jalon 2 : classes et questions**

- Base Dexie, classes, élèves (import par collage), banques de questions, import/export JSON/CSV.

**Jalon 3 : diffusion en classe**

- Vue Projection, liaison PeerJS par QR, révélation, histogramme, mode dégradé sans liaison.
- Modes entraînement / évaluation, notation de la série (note ou pourcentage), écran de fin de série.

**Jalon 4 : audio + Google Drive**

- Lecteur et extraits, mode A (lien public), cache hors ligne, puis mode B (OAuth/Picker).
- Éditeur de marqueurs avec forme d'onde, boutons de marqueurs et raccourcis en vue Projection.
- Export de la sélection audio (MP3/WAV, fondus, export groupé des zones, vers l'appareil, le Drive ou la médiathèque).
- Extraits vidéo YouTube : analyse du lien, choix début/fin, marqueurs, lecture avec arrêt automatique, avertissement hors ligne.

**Jalon 4 bis : compte Google et synchronisation**

- Connexion/déconnexion, profil, mode sans compte conservé.
- Synchronisation des banques et réglages dans `appDataFolder`.
- Chiffrement et synchronisation des classes et résultats ; option « ne jamais synchroniser les élèves ».
- Tests : deux navigateurs connectés au même compte, modifications croisées, passage hors ligne puis retour en ligne.

**Jalon 5 : résultats et Pronote**

- Tableaux, exports CSV/XLSX Pronote (notes et compétences), sauvegarde/restauration.
- Suivi des résultats : tableaux, carte de chaleur, graphiques, courbes d'évolution, fiche élève imprimable, mode projection anonyme.

**Jalon 6 : finitions**

- Accessibilité (contrastes, tailles), guide enseignant, captures README, version 1.0.

---

## 13 bis. Prévisualisation pendant le développement

- **Serveur de développement Vite** : `npm run dev` → `http://localhost:5173` (rechargement instantané à chaque modification). C'est le serveur à lancer par défaut pour prévisualiser.
- **Claude Code (application de bureau)** : configurer le serveur dans `.claude/launch.json` pour qu'il s'ouvre dans le panneau de prévisualisation intégré :
  ```json
  {
    "version": "0.0.1",
    "configurations": [
      {
        "name": "Clikards (dev)",
        "runtimeExecutable": "npm",
        "runtimeArgs": ["run", "dev"],
        "port": 5173
      }
    ]
  }
  ```
- **Test sur smartphone (caméra)** : la caméra n'est accessible qu'en **HTTPS** (sauf sur `localhost`). Prévoir :
  - `npm run dev:lan` → Vite avec `--host` et `@vitejs/plugin-basic-ssl` (HTTPS auto-signé, accessible depuis le téléphone sur le même Wi-Fi via `https://<ip-du-pc>:5173`, accepter l'avertissement du navigateur) ;
  - ou `npm run dev:tunnel` → tunnel HTTPS temporaire (`cloudflared tunnel --url http://localhost:5173`) pour tester depuis n'importe quel réseau, y compris celui du collège.
  - La connexion Google ne fonctionne pas sur une adresse IP : tester le scan sans compte, et le compte sur `localhost` ou sur l'adresse du tunnel déclarée dans la console Google.
- **Aperçu de production** : `npm run build && npm run preview` (vérifie la PWA et le mode hors ligne, impossibles à tester correctement en mode dev).
- **Prévisualisation en ligne par Pull Request** (optionnel) : déployer chaque PR dans un sous-dossier GitHub Pages ou sur Netlify/Cloudflare Pages pour tester sur le téléphone avant fusion.

---

## 14. Règles de travail pour Claude Code

- Travailler **jalon par jalon** ; à la fin de chacun : tests verts, build OK, résumé des changements, puis attendre validation avant le suivant.
- Petits commits en français, au format `type(portée): description` (ex. `feat(scan): stabilisation sur 3 détections`).
- Une branche par jalon, puis Pull Request vers `main`.
- Toute décision technique non triviale est notée dans `docs/DECISIONS.md` (contexte, options, choix).
- Ne jamais committer de clé, d'identifiant Google ou de données d'élèves (vérifier `.gitignore`).
- En cas d'ambiguïté fonctionnelle, **poser la question** plutôt que deviner.
- Interface en français, vocabulaire de l'Éducation nationale (classe, séance, devoir, compétence, degré de maîtrise).
- Prévoir des **données de démonstration** (classe fictive « 6e Démo », élèves fictifs) pour tester sans données réelles.

---

## 15. Critères d'acceptation de la v1

- [ ] 30 cartes lues en moins de 10 s depuis le fond d'une salle de classe standard, avec un smartphone milieu de gamme.
- [ ] Orientation correcte à plus de 99 % sur les images de test.
- [ ] Une banque de 10 questions sonores importée depuis un dossier Drive partagé, puis jouée **sans connexion**.
- [ ] Les résultats d'une session collés dans un devoir Pronote sans retouche.
- [ ] Aucune requête réseau contenant un nom d'élève (vérification dans l'onglet réseau des outils de développement).
- [ ] Application installable (PWA) sur ordinateur et smartphone.
- [ ] Une série de 10 questions en mode évaluation produit une note sur 20 **et** un pourcentage (bascule sans perte), avec coefficients et questions non notées correctement pris en compte.
- [ ] Un fichier audio de 5 min avec 6 marqueurs : chaque marqueur démarre la lecture au bon endroit (écart < 0,1 s) par clic et par touche `1`–`6`.
- [ ] Une sélection de 30 s d'un MP3 de 5 min exportée en MP3 et en WAV : durée exacte (écart < 0,05 s), fondus appliqués, fichier lisible dans VLC et Audacity ; enregistrement dans le Drive et ajout à la médiathèque fonctionnels.
- [ ] Un lien de partage YouTube collé tel quel (`youtu.be/…?si=…&t=…`) est reconnu ; l'extrait choisi démarre au bon endroit et s'arrête seul à la fin prévue (écart < 0,3 s).
- [ ] Courbe d'évolution d'un élève sur 5 sessions affichée et exportée en PNG ; fiche élève imprimable en PDF.
- [ ] Connexion Google sur un 2e ordinateur : banques, sons et réglages retrouvés en moins de 30 s ; classes retrouvées après un simple déverrouillage par passkey (ou scan du QR code d'appairage), **sans aucune saisie de mot de passe ou de phrase secrète**.
- [ ] Les fichiers `.enc` téléchargés depuis l'API Drive sont illisibles sans la clé de l'appareil.
- [ ] Restauration complète sur un appareil neuf à partir de la seule fiche de récupération imprimée.
- [ ] L'application fonctionne entièrement sans connexion Google (mode local).
