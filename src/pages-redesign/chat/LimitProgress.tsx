import { useLanguage } from '../../i18n';
import s from './LimitProgress.module.css';

interface LimitProgressProps {
  count: number;
  total: number;
}

export function LimitProgress({ count, total }: LimitProgressProps) {
  const { t } = useLanguage();
  const safeTotal = Math.max(1, total);
  const pct = Math.max(0, Math.min(1, count / safeTotal));
  const showHint = count >= Math.max(0, total - 10) && count < total;

  return (
    <div className={s.progressContainer}>
      {showHint && (
        <div className={s.hint}>
          {t('landing.redesign.chatPage.limit.hint' as any)}
        </div>
      )}
      <div 
        className={s.hairline} 
        style={{ transform: `scaleX(${pct})` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={count}
      />
    </div>
  );
}

interface LimitBannerProps {
  resetTimerStr: string;
}

export function LimitBanner({ resetTimerStr }: LimitBannerProps) {
  const { t } = useLanguage();
  return (
    <div className={s.banner} role="status" aria-live="polite">
      <div className={s.bannerRule} />
      <div className={s.bannerContent}>
        <div className={s.bannerTitle}>{t('landing.redesign.chatPage.limit.banner.title' as any)}</div>
        <div className={s.bannerTimer}>{t('landing.redesign.chatPage.limit.banner.resetIn' as any).replace('{time}', resetTimerStr)}</div>
      </div>
      <div className={s.bannerRule} />
    </div>
  );
}
