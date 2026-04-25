import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStars, type PackId, type PaymentProvider } from '../hooks/useStars';
import { StarsBalance } from '../components/StarsBalance';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../i18n';
import s from './Shop.module.css';

/* ── Pack catalogue (mirrors billing-create-invoice/packs.ts) ── */
interface Pack {
  id: PackId;
  stars: number;
  bonus: number;
  priceUsd: number;
  /** Telegram Stars price (in ⭐, what user pays inside Telegram). */
  tgStars: number;
  best?: boolean;
}

const PACKS: Pack[] = [
  { id: 'stars_100',   stars: 100,    bonus: 0,    priceUsd: 5,   tgStars: 350   },
  { id: 'stars_550',   stars: 550,    bonus: 50,   priceUsd: 25,  tgStars: 1700  },
  { id: 'stars_2400',  stars: 2400,   bonus: 400,  priceUsd: 100, tgStars: 7000, best: true },
  { id: 'stars_13000', stars: 13000,  bonus: 3000, priceUsd: 500, tgStars: 35000 },
];

export default function Shop() {
  const { t } = useLanguage();
  const nav = useNavigate();
  const { balance, loading, buyPack, refetch } = useStars();
  const { showToast, ToastContainer } = useToast();
  const [params, setParams] = useSearchParams();

  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);

  /* ── Handle redirect-back from a payment provider (`?paid=<id>`) ── */
  useEffect(() => {
    const paid = params.get('paid');
    if (!paid) return;

    showToast(t('shop.paidToast'), 'success');

    // Webhook may lag a couple seconds — refetch a few times.
    void refetch();
    const t1 = setTimeout(() => { void refetch(); }, 2500);
    const t2 = setTimeout(() => { void refetch(); }, 6000);

    // Strip ?paid from URL so reload doesn't re-toast.
    const next = new URLSearchParams(params);
    next.delete('paid');
    setParams(next, { replace: true });

    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('paid')]);

  function handlePick(provider: PaymentProvider) {
    if (!selectedPack) return;
    const pack = selectedPack;
    setSelectedPack(null);
    void buyPack(pack.id, provider);
  }

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <header className={s.header}>
        <button
          type="button"
          onClick={() => nav(-1)}
          className={s.backBtn}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className={s.title}>{t('shop.title')}</h1>
        <StarsBalance balance={balance} />
      </header>

      {/* ── Body ── */}
      <main className={s.main}>
        <div className={s.hero}>
          <div className={s.heroIcon} aria-hidden="true">⭐</div>
          <p className={s.heroSubtitle}>{t('shop.subtitle')}</p>
        </div>

        <div className={s.packs}>
          {PACKS.map((p, idx) => (
            <motion.button
              key={p.id}
              disabled={loading}
              onClick={() => setSelectedPack(p)}
              className={`${s.pack} ${p.best ? s.packBest : ''}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.985 }}
            >
              {p.best && <span className={s.bestBadge}>BEST VALUE</span>}

              <div className={s.packLeft}>
                <span className={s.packStars}>
                  <span className={s.packStarIcon} aria-hidden="true">⭐</span>
                  {p.stars.toLocaleString()}
                </span>
                {p.bonus > 0 && (
                  <span className={s.packBonus}>
                    +{p.bonus} {t('shop.bonus')}
                  </span>
                )}
              </div>

              <div className={s.packRight}>
                <span className={s.packPrice}>${p.priceUsd}</span>
                <span className={s.packCta}>{t('shop.buy')}</span>
              </div>
            </motion.button>
          ))}
        </div>

        <p className={s.footnote}>{t('shop.footnote')}</p>
      </main>

      <PaymentMethodModal
        open={selectedPack !== null}
        pack={selectedPack}
        loading={loading}
        onClose={() => setSelectedPack(null)}
        onPick={handlePick}
      />

      <ToastContainer />
    </div>
  );
}
