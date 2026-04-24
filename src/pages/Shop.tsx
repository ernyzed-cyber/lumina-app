import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStars, type PackId } from '../hooks/useStars';
import { StarsBalance } from '../components/StarsBalance';
import { useLanguage } from '../i18n';

/* ── Pack catalogue (prices in USD, matching billing-create-invoice/packs.ts) ── */
const PACKS: Array<{ id: PackId; stars: number; bonus: number; priceUsd: number }> = [
  { id: 'stars_100',   stars: 100,    bonus: 0,    priceUsd: 5   },
  { id: 'stars_550',   stars: 550,    bonus: 50,   priceUsd: 25  },
  { id: 'stars_2400',  stars: 2400,   bonus: 400,  priceUsd: 100 },
  { id: 'stars_13000', stars: 13000,  bonus: 3000, priceUsd: 500 },
];

export default function Shop() {
  const { t } = useLanguage();
  const nav = useNavigate();
  const { balance, loading, buyPack } = useStars();

  return (
    <div className="min-h-dvh bg-[#0F0D15] text-white flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="p-2 rounded-xl hover:bg-white/10 transition"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-bold">{t('shop.title')}</h1>
        <StarsBalance balance={balance} />
      </header>

      {/* ── Body ── */}
      <main className="flex-1 px-4 py-6 max-w-sm mx-auto w-full space-y-6">
        <p className="text-sm text-white/60 text-center">{t('shop.subtitle')}</p>

        <div className="grid grid-cols-1 gap-3">
          {PACKS.map((p) => (
            <button
              key={p.id}
              disabled={loading}
              onClick={() => void buyPack(p.id)}
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-fuchsia-500/10 border border-white/10 hover:border-amber-400/40 active:scale-[0.98] transition disabled:opacity-50"
            >
              <div className="text-left">
                <div className="text-xl font-bold">⭐ {p.stars.toLocaleString()}</div>
                {p.bonus > 0 && (
                  <div className="text-xs text-amber-300">
                    +{p.bonus} {t('shop.bonus')}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">${p.priceUsd}</div>
                <div className="text-xs text-white/50">{t('shop.buy')}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-white/40 text-center pt-4">{t('shop.footnote')}</p>
      </main>
    </div>
  );
}
