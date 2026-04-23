export const MSG_PACK_STARS = 100;
export const MSG_PACK_MESSAGES = 100;

export interface BuyPackDeps {
  spendStars: (args: { userId: string; amount: number; reason: string; refId: string }) => Promise<number>;
  bumpBoughtToday: (args: { userId: string; addMessages: number }) => Promise<number>;
  newUuid: () => string;
}

export interface BuyPackResult {
  new_balance: number;
  bought_today: number;
  added: number;
}

export async function handleBuyMessagePack(
  req: { userId: string },
  deps: BuyPackDeps,
): Promise<BuyPackResult> {
  const refId = deps.newUuid();
  const newBalance = await deps.spendStars({
    userId: req.userId,
    amount: MSG_PACK_STARS,
    reason: 'spend:messages:pack',
    refId,
  });
  if (newBalance < 0) throw new Error('insufficient stars');
  const boughtToday = await deps.bumpBoughtToday({ userId: req.userId, addMessages: MSG_PACK_MESSAGES });
  return { new_balance: newBalance, bought_today: boughtToday, added: MSG_PACK_MESSAGES };
}
