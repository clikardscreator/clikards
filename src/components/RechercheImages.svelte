<script lang="ts">
  import { rechercherImages, texteAttribution, type ImageTrouvee } from '../lib/images/openverse';

  let { onchoisir }: { onchoisir?: (image: ImageTrouvee) => void } = $props();

  let requete = $state('');
  let images = $state<ImageTrouvee[]>([]);
  let chargement = $state(false);
  let erreur = $state('');
  let aDejaCherche = $state(false);
  let imageSelectionnee = $state<ImageTrouvee | null>(null);

  async function lancerRecherche(evenement: SubmitEvent) {
    evenement.preventDefault();
    const termes = requete.trim();
    if (!termes) return;

    chargement = true;
    erreur = '';
    aDejaCherche = true;

    try {
      const resultat = await rechercherImages(termes);
      images = resultat.images;
    } catch {
      erreur = 'Impossible de contacter Openverse. Vérifiez votre connexion internet.';
      images = [];
    } finally {
      chargement = false;
    }
  }

  function choisir(image: ImageTrouvee) {
    imageSelectionnee = image;
    onchoisir?.(image);
  }
</script>

<div class="recherche-images">
  <form onsubmit={lancerRecherche}>
    <label for="requete-image">Rechercher une image libre de droits (Openverse)</label>
    <div class="ligne-recherche">
      <input
        id="requete-image"
        type="search"
        placeholder="ex. piano, orchestre symphonique, guitare électrique…"
        bind:value={requete}
      />
      <button type="submit" disabled={chargement || !requete.trim()}>
        {chargement ? 'Recherche…' : 'Rechercher'}
      </button>
    </div>
  </form>

  {#if erreur}
    <p class="erreur">{erreur}</p>
  {/if}

  {#if imageSelectionnee}
    <div class="selection">
      <img src={imageSelectionnee.miniature} alt={imageSelectionnee.titre} />
      <div>
        <p class="selection-titre">Image sélectionnée : {imageSelectionnee.titre}</p>
        <p class="selection-attribution">{texteAttribution(imageSelectionnee)}</p>
      </div>
    </div>
  {/if}

  {#if aDejaCherche && !chargement && images.length === 0 && !erreur}
    <p class="aide">Aucun résultat pour cette recherche.</p>
  {/if}

  {#if images.length > 0}
    <ul class="grille">
      {#each images as image (image.id)}
        <li>
          <button type="button" class="carte-image" onclick={() => choisir(image)}>
            <img src={image.miniature} alt={image.titre} loading="lazy" />
            <span class="licence">{image.licence}</span>
          </button>
          <p class="legende" title={image.titre}>{image.titre}</p>
          {#if image.auteur}
            <p class="auteur">par {image.auteur}</p>
          {/if}
        </li>
      {/each}
    </ul>
    <p class="aide">
      Images sous licence Creative Commons ou domaine public — l'attribution est ajoutée
      automatiquement avec l'image choisie.
    </p>
  {/if}
</div>

<style>
  .recherche-images {
    max-width: 48rem;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  label {
    font-size: 0.9rem;
    color: var(--text);
  }
  .ligne-recherche {
    display: flex;
    gap: 0.5rem;
  }
  input[type='search'] {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    font-size: 0.95rem;
  }
  button[type='submit'] {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: #fff;
    cursor: pointer;
    font-size: 0.95rem;
  }
  button[type='submit']:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .erreur {
    margin-top: 1rem;
    color: #b91c1c;
  }
  .aide {
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .selection {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-top: 1.25rem;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background-color: var(--accent-bg);
    text-align: left;
  }
  .selection img {
    width: 4.5rem;
    height: 4.5rem;
    object-fit: cover;
    border-radius: 0.4rem;
    flex-shrink: 0;
  }
  .selection-titre {
    font-weight: 600;
    color: var(--text-h);
  }
  .selection-attribution {
    color: var(--text-muted);
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
  .grille {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 1rem;
    list-style: none;
    margin: 1.5rem 0 0;
    padding: 0;
    text-align: left;
  }
  .carte-image {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
    cursor: pointer;
    background: none;
    aspect-ratio: 1;
  }
  .carte-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .carte-image:hover {
    outline: 2px solid var(--accent);
  }
  .licence {
    position: absolute;
    bottom: 0.25rem;
    right: 0.25rem;
    background-color: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: 0.65rem;
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
  }
  .legende {
    margin-top: 0.35rem;
    font-size: 0.8rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .auteur {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>
