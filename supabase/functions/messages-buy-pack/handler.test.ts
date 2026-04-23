import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleBuyMessagePack, type BuyPackDeps, MSG_PACK_STARS, MSG_PACK_MESSAGES } from './handler.ts';

function deps(over: Partial<BuyPackDeps> = {}): BuyPackDeps {
  return {
    spendStars: async () => 0,
    bumpBoughtToday: async () => MSG_PACK_MESSAGES,
    newUuid: () => 'pack-uuid-1',
    ...over,
  };
}

Deno.test('spends exactly MSG_PACK_STARS', async () => {
  let spent = 0;
  await handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async (args) => { spent = args.amount; return 0; } }));
  assertEquals(spent, MSG_PACK_STARS);
});

Deno.test('uses reason=spend:messages:pack and unique ref_id', async () => {
  let reason = '';
  let refId = '';
  await handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async (args) => { reason = args.reason; refId = args.refId; return 0; } }));
  assertEquals(reason, 'spend:messages:pack');
  assertEquals(refId, 'pack-uuid-1');
});

Deno.test('rejects on insufficient stars (spend returns -1)', async () => {
  await assertRejects(
    () => handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async () => -1 })),
    Error,
    'insufficient',
  );
});

Deno.test('bumps bought_today by MSG_PACK_MESSAGES', async () => {
  let added = 0;
  await handleBuyMessagePack({ userId: 'u' }, deps({ bumpBoughtToday: async (args) => { added = args.addMessages; return 200; } }));
  assertEquals(added, MSG_PACK_MESSAGES);
});

Deno.test('returns balance, bought_today, added', async () => {
  const res = await handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async () => 400, bumpBoughtToday: async () => 100 }));
  assertEquals(res, { new_balance: 400, bought_today: 100, added: MSG_PACK_MESSAGES });
});
