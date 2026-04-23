import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleGiftSend, type GiftSendDeps, type GiftCatalogEntry } from './handler.ts';

function gift(over: Partial<GiftCatalogEntry> = {}): GiftCatalogEntry {
  return {
    id: 'rose',
    category: 'gift',
    name_ru: 'Роза', name_en: 'Rose',
    price_stars: 20,
    emoji: '🌹',
    memory_template_ru: 'Он подарил мне розу {date}.',
    memory_template_en: 'He gave me a rose on {date}.',
    intimacy_delta: 0.1,
    is_trigger_event: false,
    trigger_scene_id: null,
    active: true,
    ...over,
  };
}

function makeDeps(over: Partial<GiftSendDeps> = {}): GiftSendDeps {
  return {
    loadGift: async () => gift(),
    spendStars: async () => 480,
    insertGiftSent: async () => {},
    insertMemory: async () => ({ id: 'mem-1' }),
    bumpIntimacy: async () => 1.1,
    newUuid: () => 'gift-uuid-1',
    todayLocal: async () => '2026-04-23',
    ...over,
  };
}

Deno.test('rejects unknown gift', async () => {
  await assertRejects(
    () => handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'xxx', lang: 'ru' }, makeDeps({ loadGift: async () => null })),
    Error,
    'unknown',
  );
});

Deno.test('rejects inactive gift', async () => {
  await assertRejects(
    () => handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({ loadGift: async () => gift({ active: false }) })),
    Error,
    'unavailable',
  );
});

Deno.test('rejects when insufficient funds (spendStars returns -1)', async () => {
  await assertRejects(
    () => handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({ spendStars: async () => -1 })),
    Error,
    'insufficient',
  );
});

Deno.test('renders RU memory template with date', async () => {
  let capturedSummary = '';
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({
    insertMemory: async (args) => { capturedSummary = args.summary; return { id: 'mem-1' }; },
  }));
  assertEquals(capturedSummary, 'Он подарил мне розу 2026-04-23.');
});

Deno.test('renders EN memory template with date', async () => {
  let capturedSummary = '';
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'en' }, makeDeps({
    insertMemory: async (args) => { capturedSummary = args.summary; return { id: 'mem-1' }; },
  }));
  assertEquals(capturedSummary, 'He gave me a rose on 2026-04-23.');
});

Deno.test('trigger event sets scene marker on intimacy bump', async () => {
  let capturedMarker: string | null = 'unset';
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'date_dinner', lang: 'ru' }, makeDeps({
    loadGift: async () => gift({ id: 'date_dinner', is_trigger_event: true, trigger_scene_id: 'first_night', intimacy_delta: 1.5 }),
    bumpIntimacy: async (args) => { capturedMarker = args.sceneMarker; return 2.6; },
  }));
  assertEquals(capturedMarker, 'first_night');
});

Deno.test('happy path returns new balance, memory id, intimacy', async () => {
  const res = await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({
    spendStars: async () => 480,
    insertMemory: async () => ({ id: 'mem-42' }),
    bumpIntimacy: async () => 1.2,
  }));
  assertEquals(res, { new_balance: 480, memory_id: 'mem-42', intimacy_level: 1.2, gift_id: 'rose' });
});

Deno.test('sets intimacy_weight = intimacy_delta * 3 (clamped to 3.0)', async () => {
  let weight = -1;
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'ring', lang: 'ru' }, makeDeps({
    loadGift: async () => gift({ id: 'ring', intimacy_delta: 0.8, price_stars: 500 }),
    insertMemory: async (args) => { weight = args.intimacyWeight; return { id: 'm' }; },
  }));
  assertEquals(weight, 2.4000000000000004); // floating point: 0.8 * 3
});

Deno.test('clamps intimacy_weight at 3.0 for very expensive gifts', async () => {
  let weight = -1;
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'trip', lang: 'ru' }, makeDeps({
    loadGift: async () => gift({ id: 'trip', intimacy_delta: 3.5, price_stars: 5000 }),
    insertMemory: async (args) => { weight = args.intimacyWeight; return { id: 'm' }; },
  }));
  assertEquals(weight, 3.0);
});
