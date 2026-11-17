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

describe('BanqueDetail — plusieurs extraits audio importés depuis le disque', () => {
  it("importe deux extraits sans planter (régression currentTarget nul après l'await)", async () => {
    const banque = await creerBanque({ titre: 'Banque de test' });
    render(BanqueDetail, { props: { params: { id: banque.id } } });

    await waitFor(() => screen.getByText('Nouvelle question'));
    await fireEvent.click(screen.getByText('Nouvelle question'));

    await fireEvent.input(screen.getByLabelText('Énoncé'), {
      target: { value: 'Reconnaître deux extraits' },
    });
    await fireEvent.input(screen.getByPlaceholderText('Réponse A'), { target: { value: 'A' } });
    await fireEvent.input(screen.getByPlaceholderText('Réponse B'), { target: { value: 'B' } });
    await fireEvent.change(screen.getByLabelText('Bonne réponse'), { target: { value: 'A' } });

    // `evenement.currentTarget` redevient null une fois l'événement `change`
    // terminé ; le lire après le premier `await importerSonLocal(...)` (pour
    // remettre l'input à vide) levait « Cannot set properties of null ».
    for (const [i, nom] of ['extrait-1.mp3', 'extrait-2.mp3'].entries()) {
      await fireEvent.click(screen.getByText('+ Ajouter un extrait audio'));
      const champFichier = document.querySelector(
        '.bloc-audio input[type="file"][accept="audio/*"]',
      ) as HTMLInputElement;
      const fichier = new File([new Uint8Array(5)], nom, { type: 'audio/mpeg' });
      await fireEvent.change(champFichier, { target: { files: [fichier] } });
      // Attendre que l'import (asynchrone : importerSonLocal + listerSons)
      // soit bien terminé avant de rouvrir le panneau pour le suivant.
      await waitFor(() => expect(screen.getAllByText('Retirer').length).toBe(i + 1));
    }

    await fireEvent.click(screen.getByText('Ajouter la question'));

    await waitFor(async () => {
      const questions = await listerQuestionsParBanque(banque.id);
      expect(questions).toHaveLength(1);
    });

    const [question] = await listerQuestionsParBanque(banque.id);
    expect(question.audios).toHaveLength(2);
    expect(question.audios?.map((a) => a.lectureAuto)).toEqual([false, false]);
    expect(question.audios?.[0].sonId).not.toBe(question.audios?.[1].sonId);

    const sons = await db.sons.toArray();
    expect(sons.map((s) => s.titre).sort()).toEqual(['extrait-1', 'extrait-2']);
  });
});
