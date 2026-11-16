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

## À propos de `VITE_GOOGLE_API_KEY`

Cette seconde variable (clé API, pas un identifiant OAuth) servira plus tard pour l'import de
sons depuis un dossier Google Drive partagé par lien (section 7, mode A — `files.list` avec une
clé API restreinte au domaine GitHub Pages). Elle n'est pas nécessaire pour la connexion au
compte et peut rester vide pour l'instant.

## Dépannage

- **« Origine non autorisée »** dans la console du navigateur : vérifiez que l'origine exacte
  (schéma + domaine + port, sans chemin) figure bien dans la liste des origines JavaScript
  autorisées, et que vous avez bien redémarré le serveur de dev après modification.
- **Rien ne se passe au clic** : vérifiez que `VITE_GOOGLE_CLIENT_ID` est bien défini dans
  `.env.local` (pas seulement dans `.env.example`) et que le fichier est à la racine du projet.
- **Écran « Cette application n'est pas vérifiée »** : normal tant que le projet est en mode Test
  et que vous êtes connecté avec l'adresse déclarée comme utilisateur de test ; cliquez sur
  « Continuer ».
