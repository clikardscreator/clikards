<script lang="ts">
  let heure = new Date().toLocaleTimeString('fr-FR');
</script>

<main>
  <h1>Clikards</h1>
  <p class="sous-titre">Cartes-réponses pour la classe — sans appareil élève</p>

  <div class="choix">
    <button type="button">Projection</button>
    <button type="button">Scanner</button>
  </div>

  <p class="horloge">Socle initialisé à {heure}</p>
</main>

<style>
  main {
    max-width: 32rem;
    margin: 4rem auto;
    text-align: center;
    font-family: system-ui, sans-serif;
  }
  .sous-titre {
    color: #555;
  }
  .choix {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
  }
  button {
    padding: 0.75rem 1.5rem;
    font-size: 1.1rem;
    border-radius: 0.5rem;
    border: 1px solid #ccc;
    cursor: pointer;
  }
  .horloge {
    color: #888;
    font-size: 0.9rem;
  }
</style>
