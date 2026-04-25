import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStars } from './useStars';

/* ── Mock lib/supabase ── */
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

/* ── Mock lib/telegram (haptic side-effects) ── */
vi.mock('../lib/telegram', () => ({
  tg: { haptic: vi.fn() },
}));

import { supabase } from '../lib/supabase';

const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

function makeFromChain(rows: { delta: number }[]) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ select });
  return { eq, select };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  makeFromChain([{ delta: 100 }, { delta: 50 }]);
});

describe('useStars – balance', () => {
  it('fetches and sums ledger rows on mount', async () => {
    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.balance).toBe(150));
  });

  it('stays 0 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useStars());
    await act(async () => {});
    expect(result.current.balance).toBe(0);
  });

  it('stays 0 when ledger is empty', async () => {
    makeFromChain([]);
    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.balance).toBe(0));
    expect(mockFrom).toHaveBeenCalledWith('stars_ledger');
  });
});

describe('useStars – buyPack', () => {
  it('calls billing-create-invoice with pack_id and opens pay_url', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    mockInvoke.mockResolvedValue({
      data: { pay_url: 'https://pay.cryptocloud.plus/test' },
      error: null,
    });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyPack('stars_100'); });

    expect(mockInvoke).toHaveBeenCalledWith('billing-create-invoice', {
      body: { pack_id: 'stars_100' },
    });
    expect(openSpy).toHaveBeenCalledWith('https://pay.cryptocloud.plus/test', '_blank');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    openSpy.mockRestore();
  });

  it('sets error when function returns an error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('network error'),
    });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyPack('stars_550'); });

    expect(result.current.error).toBe('network error');
    expect(result.current.loading).toBe(false);
  });

  it('sets error when pay_url is missing from response', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyPack('stars_2400'); });

    expect(result.current.error).toBe('no pay_url');
  });

  it('sets error when data is null and error is null', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyPack('stars_13000'); });

    expect(result.current.error).toBe('no pay_url');
  });

  it('loading is true during buyPack, false after', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    let resolveInvoke!: (v: unknown) => void;
    mockInvoke.mockReturnValue(
      new Promise((res) => { resolveInvoke = res; }),
    );

    const { result } = renderHook(() => useStars());

    let buyPromise: Promise<void>;
    act(() => { buyPromise = result.current.buyPack('stars_100'); });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveInvoke({ data: { pay_url: 'https://pay.example.com' }, error: null });
      await buyPromise;
    });
    expect(result.current.loading).toBe(false);
  });
});

describe('useStars – buyPack (telegram provider)', () => {
  it('calls billing-create-invoice-tg and opens deep_link when provider=telegram', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    mockInvoke.mockResolvedValue({
      data: { deep_link: 'https://t.me/LuminaPayBot?start=inv_abc' },
      error: null,
    });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyPack('stars_100', 'telegram'); });

    expect(mockInvoke).toHaveBeenCalledWith('billing-create-invoice-tg', {
      body: { pack_id: 'stars_100' },
    });
    expect(openSpy).toHaveBeenCalledWith('https://t.me/LuminaPayBot?start=inv_abc', '_blank');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);

    openSpy.mockRestore();
  });

  it('sets error when telegram response is missing deep_link', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyPack('stars_550', 'telegram'); });

    expect(result.current.error).toBe('no deep_link');
  });

  it('defaults to cryptocloud when provider is omitted', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    mockInvoke.mockResolvedValue({
      data: { pay_url: 'https://pay.cryptocloud.plus/x' },
      error: null,
    });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyPack('stars_100'); });

    expect(mockInvoke).toHaveBeenCalledWith('billing-create-invoice', {
      body: { pack_id: 'stars_100' },
    });
  });
});

describe('useStars – buyMessagesPack', () => {
  it('calls messages-buy-pack and refreshes balance on success', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true, messages_bought: 100 }, error: null });

    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.balance).toBe(150));

    // Reset call count; simulate balance after spending 100⭐
    mockInvoke.mockClear();
    mockFrom.mockClear();
    makeFromChain([{ delta: 50 }]);

    await act(async () => { await result.current.buyMessagesPack(); });

    expect(mockInvoke).toHaveBeenCalledWith('messages-buy-pack');
    expect(result.current.balance).toBe(50);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets error when messages-buy-pack returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('insufficient stars') });

    const { result } = renderHook(() => useStars());
    await act(async () => { await result.current.buyMessagesPack(); });

    expect(result.current.error).toBe('insufficient stars');
    expect(result.current.loading).toBe(false);
  });

  it('exposes refetch as an alias for fetchBalance', async () => {
    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.balance).toBe(150));

    mockFrom.mockClear();
    makeFromChain([{ delta: 200 }]);

    await act(async () => { await result.current.refetch(); });

    expect(result.current.balance).toBe(200);
  });
});
