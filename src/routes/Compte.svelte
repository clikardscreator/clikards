<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { compte } from '../lib/auth/compte';
  import { chargerGoogleIdentityServices, profilDepuisJetonId } from '../lib/auth/google';

  const idClient = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  let zoneBouton: HTMLDivElement | undefined = $state();
  let chargement = $state(Boolean(idClient));
  let erreur = $state('');

  onMount(() => {
    if (!idClient) {
      return;
    }

    chargerGoogleIdentityServices()
      .then(() => {
        if (!zoneBouton) return;
        window.google!.accounts.id.initialize({
          client_id: idClient,
          auto_select: false,
          callback: (reponse) => {
            compte.set(profilDepuisJetonId(reponse.credential));
          },
        });
        window.google!.accounts.id.renderButton(zoneBouton, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'fr',
        });
      })
      .catch(() => {
        erreur = 'Impossible de contacter Google. Vérifiez votre connexion internet.';
      })
      .finally(() => {
        chargement = false;
      });
  });

  function seDeconnecter() {
    window.google?.accounts.id.disableAutoSelect();
    compte.set(null);
  }
</script>

<section class="page-compte">
  <h1>Compte</h1>

  {#if !idClient}
    <p class="description">
      La connexion avec un compte Google n'est pas encore configurée pour cette installation.
    </p>
    <p class="aide">
      Pour l'activer : créez un identifiant client OAuth dans la console Google Cloud (guide pas à
      pas dans <code>docs/GOOGLE_SETUP.md</code>), puis renseignez
      <code>VITE_GOOGLE_CLIENT_ID</code> dans un fichier <code>.env.local</code> à la racine du
      projet (voir <code>.env.example</code>).
    </p>
  {:else if $compte}
    <div class="profil">
      {#if $compte.photoUrl}
        <img src={$compte.photoUrl} alt="" class="avatar" referrerpolicy="no-referrer" />
      {/if}
      <div>
        <p class="nom">{$compte.nom}</p>
        <p class="email">{$compte.email}</p>
      </div>
    </div>
    <button type="button" class="bouton-secondaire" onclick={seDeconnecter}>
      Se déconnecter
    </button>
    <p class="aide">
      La synchronisation automatique des classes et des résultats avec votre Drive personnel arrive
      dans une prochaine étape. En attendant, utilisez la
      <a href="/reglages" use:link>sauvegarde</a> des Réglages pour ne rien perdre.
    </p>
  {:else}
    <p class="description">
      Connectez-vous pour retrouver vos banques et vos réglages sur tous vos appareils.
    </p>
    <div bind:this={zoneBouton} class="bouton-google"></div>
    {#if chargement}
      <p class="aide">Chargement du bouton de connexion…</p>
    {/if}
    {#if erreur}
      <p class="erreur">{erreur}</p>
    {/if}
    <p class="aide">
      L'application reste utilisable sans compte : vos données restent sur cet appareil, et la page <a
        href="/reglages"
        use:link>Réglages</a
      > permet de les sauvegarder.
    </p>
  {/if}
</section>

<style>
  .page-compte {
    max-width: 28rem;
    margin: 3rem auto;
    padding: 0 1.5rem;
    text-align: center;
  }
  .description {
    color: var(--text);
  }
  .aide {
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .aide a {
    color: var(--accent);
  }
  .erreur {
    margin-top: 1rem;
    color: #b91c1c;
    font-size: 0.9rem;
  }
  .bouton-google {
    display: flex;
    justify-content: center;
    margin-top: 1.5rem;
    min-height: 2.75rem;
  }
  .profil {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
    text-align: left;
  }
  .avatar {
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
  }
  .nom {
    font-weight: 600;
    color: var(--text-h);
  }
  .email {
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  .bouton-secondaire {
    margin-top: 1.5rem;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background-color: #f8fafc;
    color: var(--text-h);
    cursor: pointer;
    font-size: 0.95rem;
  }
  .bouton-secondaire:hover {
    background-color: var(--accent-bg);
  }
</style>
