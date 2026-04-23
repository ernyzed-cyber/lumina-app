export interface GiftCatalogEntry {
  id: string;
  category: string;
  name_ru: string;
  name_en: string;
  price_stars: number;
  emoji: string;
  memory_template_ru: string;
  memory_template_en: string;
  intimacy_delta: number;
  is_trigger_event: boolean;
  trigger_scene_id: string | null;
  active: boolean;
}

export interface GiftSendDeps {
  loadGift: (giftId: string) => Promise<GiftCatalogEntry | null>;
  spendStars: (args: { userId: string; amount: number; reason: string; refId: string }) => Promise<number>;
  insertGiftSent: (args: { id: string; userId: string; girlId: string; giftId: string; stars: number; delta: number }) => Promise<void>;
  insertMemory: (args: { userId: string; girlId: string; summary: string; giftRef: string; intimacyWeight: number; kind: 'gift' }) => Promise<{ id: string }>;
  bumpIntimacy: (args: { userId: string; girlId: string; delta: number; sceneMarker: string | null }) => Promise<number>;
  newUuid: () => string;
  todayLocal: (userId: string) => Promise<string>;
}

export interface GiftSendResult {
  new_balance: number;
  memory_id: string;
  intimacy_level: number;
  gift_id: string;
}

const INTIMACY_WEIGHT_CAP = 3.0;

export async function handleGiftSend(
  req: { userId: string; girlId: string; giftId: string; lang: 'ru' | 'en' },
  deps: GiftSendDeps,
): Promise<GiftSendResult> {
  const gift = await deps.loadGift(req.giftId);
  if (!gift) throw new Error(`unknown gift: ${req.giftId}`);
  if (!gift.active) throw new Error(`gift unavailable: ${req.giftId}`);

  const giftSentId = deps.newUuid();
  const newBalance = await deps.spendStars({
    userId: req.userId,
    amount: gift.price_stars,
    reason: `spend:gift:${gift.id}`,
    refId: giftSentId,
  });
  if (newBalance < 0) throw new Error('insufficient stars');

  await deps.insertGiftSent({
    id: giftSentId,
    userId: req.userId,
    girlId: req.girlId,
    giftId: gift.id,
    stars: gift.price_stars,
    delta: gift.intimacy_delta,
  });

  const date = await deps.todayLocal(req.userId);
  const template = req.lang === 'en' ? gift.memory_template_en : gift.memory_template_ru;
  const summary = template.replace('{date}', date);
  const weight = Math.min(gift.intimacy_delta * 3, INTIMACY_WEIGHT_CAP);

  const memory = await deps.insertMemory({
    userId: req.userId,
    girlId: req.girlId,
    summary,
    giftRef: gift.id,
    intimacyWeight: weight,
    kind: 'gift',
  });

  const newIntimacy = await deps.bumpIntimacy({
    userId: req.userId,
    girlId: req.girlId,
    delta: gift.intimacy_delta,
    sceneMarker: gift.is_trigger_event ? gift.trigger_scene_id : null,
  });

  return {
    new_balance: newBalance,
    memory_id: memory.id,
    intimacy_level: newIntimacy,
    gift_id: gift.id,
  };
}
