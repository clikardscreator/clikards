import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { creerBanque } from '../lib/db/banques';
import { db } from '../lib/db/database';
import { listerQuestionsParBanque } from '../lib/db/questions';
import BanqueDetail from './BanqueDetail.svelte';

beforeEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
  await db.sons.clear();
});

afterEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
  await db.sons.clear();
});

describe('BanqueDetail — question avec une image importée localement', () => {
  it('enregistre la question sans erreur de clonage structuré (régression $state.snapshot)', async () => {
    const banque = await creerBanque({ titre: 'Banque de test' });
    render(BanqueDetail, { props: { params: { id: banque.id } } });

    await waitFor(() => screen.getByText('Nouvelle question'));
    await fireEvent.click(screen.getByText('Nouvelle question'));

    await fireEvent.input(screen.getByLabelText('Énoncé'), {
      target: { value: 'Quel instrument ?' },
    });
    await fireEvent.input(screen.getByPlaceholderText('Réponse A'), {
      target: { value: 'Piano' },
    });
    await fireEvent.input(screen.getByPlaceholderText('Réponse B'), {
      target: { value: 'Violon' },
    });
    await fireEvent.change(screen.getByLabelText('Bonne réponse'), { target: { value: 'A' } });

    // Les tableaux/objets $props issus de $state sont des proxys réactifs :
    // avant la correction, les passer tels quels à Dexie/IndexedDB levait
    // une DataCloneError (« [object Array] could not be cloned »).
    const champFichier = document.querySelector(
      '.bloc-images input[type="file"]',
    ) as HTMLInputElement;
    const fichier = new File([new Uint8Array(10)], 'image-test.jpg', { type: 'image/jpeg' });
    await fireEvent.change(champFichier, { target: { files: [fichier] } });

    await fireEvent.click(screen.getByText('Ajouter la question'));

    await waitFor(async () => {
      const questions = await listerQuestionsParBanque(banque.id);
      expect(questions).toHaveLength(1);
    });

    const [question] = await listerQuestionsParBanque(banque.id);
    expect(question.enonce).toBe('Quel instrument ?');
    // Le contenu du Blob lui-même n'est pas vérifié après relecture : fake-indexeddb
    // ne le clone pas correctement sous jsdom (voir sons.test.ts) — ce qui compte
    // ici, c'est que l'écriture Dexie n'ait pas levé de DataCloneError.
    expect(question.images).toHaveLength(1);
    expect(question.images?.[0].attribution).toBe('image-test.jpg');
  });
});
