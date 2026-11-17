import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analyserExportBanque, importerBanque } from './banqueExport';
import { db } from './database';
import { listerQuestionsParBanque } from './questions';

beforeEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

afterEach(async () => {
  await db.banques.clear();
  await db.questions.clear();
});

describe('exemples/banque-timbres-6e.json', () => {
  it("est un export de banque valide qui s'importe sans erreur", async () => {
    const dossierActuel = dirname(fileURLToPath(import.meta.url));
    const chemin = resolve(dossierActuel, '../../../exemples/banque-timbres-6e.json');
    const contenu = JSON.parse(readFileSync(chemin, 'utf-8'));

    const exportBanque = analyserExportBanque(contenu);
    const banque = await importerBanque(exportBanque);

    const questions = await listerQuestionsParBanque(banque.id);
    expect(questions).toHaveLength(5);
    expect(questions.filter((q) => q.type === 'sondage')).toHaveLength(1);
  });
});
