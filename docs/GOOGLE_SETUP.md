# Configurer la connexion Google

Clikards utilise **Google Identity Services** (modèle par jeton, côté client, sans serveur). Pour
que le bouton « Se connecter avec Google » fonctionne, il faut créer un identifiant client OAuth
dans un projet Google Cloud. Cette étape se fait une seule fois, avec votre propre compte Google.

## 1. Créer (ou choisir) un projet Google Cloud

1. Allez sur [console.cloud.google.com](https://console.cloud.google.com/).
2. Créez un nouveau projet, par exemple nommé « Clikards ».

## 2. Configurer l'écran de consentement OAuth

1. Menu **API et services** → **Écran de consentement OAuth**.
2. Type d'utilisateur : **Externe**.
3. Nom de l'application : `Clikards`.
4. E-mail d'assistance utilisateur : `clikards@gmail.com` (voir `CLAUDE.md`, section 1 — ce
   compte sert uniquement de contact, il ne stocke aucune donnée élève).
5. Tant que l'application reste en mode **Test** (ce qui suffit pour un usage personnel), ajoutez
   votre propre adresse Google dans la liste des **utilisateurs de test** (section « Public
   cible » / « Test users »). Sans cela, Google refusera la connexion.

## 3. Créer l'identifiant client OAuth

1. Menu **API et services** → **Identifiants** → **Créer des identifiants** → **ID client OAuth**.
2. Type d'application : **Application Web**.
3. Nom : `Clikards (local)`.
4. **Origines JavaScript autorisées** — ajoutez chaque origine utilisée (une par ligne, sans
   chemin, sans slash final) :
   - `http://localhost:5173` (serveur de dev Vite)
   - plus tard, l'URL de votre déploiement GitHub Pages, par exemple
     `https://<votre-compte>.github.io`
5. Aucune **URI de redirection** n'est nécessaire (Google Identity Services n'en a pas besoin).
6. Cliquez sur **Créer**. Copiez l'**ID client** généré (il se termine par
   `.apps.googleusercontent.com`).

## 4. Renseigner l'identifiant dans le projet

1. Copiez `.env.example` vers `.env.local` (fichier ignoré par Git, jamais commité) :

   ```bash
   cp .env.example .env.local
   ```

2. Collez l'ID client dans `.env.local` :

   ```
   VITE_GOOGLE_CLIENT_ID=votre-id.apps.googleusercontent.com
   ```

3. Redémarrez le serveur de dev (`npm run dev`) pour que Vite recharge la variable
   d'environnement.

4. Ouvrez `/compte` dans l'application : le bouton Google officiel doit apparaître.

## 5. Configurer `VITE_GOOGLE_API_KEY` (import depuis un dossier Drive partagé)

Cette seconde variable est une **clé API**, pas un identifiant OAuth : elle sert uniquement à lire
un dossier Google Drive partagé « avec le lien » (médiathèque de sons et d'images, section 7, mode
A), sans que l'enseignant n'ait à se connecter. Elle est indépendante de `VITE_GOOGLE_CLIENT_ID`
ci-dessus.

### 5.1. Activer l'API Google Drive pour le projet

C'est l'étape la plus souvent oubliée — sans elle, Google répond systématiquement par une erreur
403, quelle que soit la clé utilisée.

1. Menu **API et services** → **Bibliothèque**.
2. Cherchez **Google Drive API** et cliquez sur **Activer**.

### 5.2. Créer la clé API

1. Menu **API et services** → **Identifiants** → **Créer des identifiants** → **Clé API**.
2. Une clé est générée immédiatement. Cliquez sur **Restreindre la clé** (fortement recommandé,
   pour éviter qu'elle ne soit utilisable pour autre chose si elle fuite) :
   - **Restrictions d'application** : « Référents HTTP (sites Web) ». Ajoutez :
     - `http://localhost:5173/*` (serveur de dev)
     - plus tard, `https://<votre-compte>.github.io/*` (déploiement GitHub Pages)

     ⚠️ Si vous restreignez par référent HTTP, l'import ne fonctionnera **que** depuis ces
     origines précises — un oubli de `localhost` est la deuxième cause la plus fréquente d'échec
     en développement.

   - **Restrictions relatives aux API** : « Restreindre la clé » → cochez uniquement
     **Google Drive API**.
3. Copiez la clé générée.

### 5.3. Renseigner la clé dans le projet

Dans `.env.local` (même fichier qu'à l'étape 4) :

```
VITE_GOOGLE_API_KEY=votre-cle-api
```

Redémarrez le serveur de dev. Ouvrez la médiathèque (`/sons`, onglet Sons ou Images) ou l'éditeur
de question (`/banques/:id`) : le formulaire d'import Drive doit remplacer le message « Non
configuré ».

### 5.4. Partager le dossier à importer

Dans Google Drive, clic droit sur le dossier → **Partager** → **Accès général** → **Tous les
utilisateurs disposant du lien** (rôle Lecteur suffit). Un dossier partagé seulement avec des
personnes nommées ne fonctionnera pas : l'API Drive avec une simple clé API ne voit que les
ressources publiques par lien.

## Dépannage

- **« Origine non autorisée »** dans la console du navigateur : vérifiez que l'origine exacte
  (schéma + domaine + port, sans chemin) figure bien dans la liste des origines JavaScript
  autorisées, et que vous avez bien redémarré le serveur de dev après modification.
- **Rien ne se passe au clic** (bouton Google) : vérifiez que `VITE_GOOGLE_CLIENT_ID` est bien
  défini dans `.env.local` (pas seulement dans `.env.example`) et que le fichier est à la racine
  du projet.
- **Écran « Cette application n'est pas vérifiée »** : normal tant que le projet est en mode Test
  et que vous êtes connecté avec l'adresse déclarée comme utilisateur de test ; cliquez sur
  « Continuer ».
- **Import Drive : « Google Drive API has not been used in project … »** : l'API Drive n'est pas
  activée pour ce projet — revenez à l'étape 5.1.
- **Import Drive : « API key not valid » ou « Requests from referer … are blocked »** : la clé est
  mal recopiée, ou la restriction par référent HTTP (étape 5.2) ne couvre pas l'origine depuis
  laquelle vous testez (vérifiez en particulier `localhost` en développement).
- **Import Drive : « Aucun fichier trouvé »** malgré un dossier non vide : le dossier n'est pas
  partagé « Tous les utilisateurs disposant du lien » (étape 5.4), ou le lien collé ne correspond
  pas à un dossier (un lien de fichier individuel ne fonctionne pas ici).
- Depuis la version actuelle, les erreurs d'import Drive affichent directement le message renvoyé
  par Google (plus précis qu'un simple code HTTP) — lisez-le avant de ré-essayer, il indique
  généralement laquelle de ces causes s'applique.
