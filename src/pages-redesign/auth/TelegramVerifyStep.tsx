/**
 * TelegramVerifyStep — финальный шаг после регистрации.
 *
 * Чисто презентационный — всё через props. Auth.tsx управляет:
 *   • generateCode() при mount (или передаёт уже сгенерированный)
 *   • real-time подпиской на profiles.telegram_verified
 *   • редиректом на /feed при успехе
 *
 * Visual: верификационный код LUM-XXXXXX в большой "code-card" + кнопка
 * "Open Telegram bot" с deep link, инструкция в 3 шага, skip-кнопка снизу.
 *
 * Props:
 *   verificationCode — null пока генерируется; иначе строка вида LUM-A1B2C3
 *   isRefreshing     — пока ждём ответ generateCode (для refresh button)
 *   isExpired        — истёк (UI помечает refresh как primary CTA)
 */
import { useLanguage } from '../../i18n';
import s from './authForms.module.css';
import t1 from './TelegramVerifyStep.module.css';

interface Props {
  verificationCode: string | null;
  isRefreshing: boolean;
  isExpired: boolean;
  onRefreshCode: () => void;
  onSkip: () => void;
}

export function TelegramVerifyStep({
  verificationCode,
  isRefreshing,
  isExpired,
  onRefreshCode,
  onSkip,
}: Props) {
  const { t } = useLanguage();

  const botUrl = verificationCode
    ? `https://t.me/LuminaAuthBot?start=${verificationCode}`
    : 'https://t.me/LuminaAuthBot';

  return (
    <>
      <h2 className={s.title}>{t('landing.redesign.auth.telegram.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.telegram.subtitle')}</p>

      <div className={t1.codeCard} data-expired={isExpired ? 'true' : 'false'}>
        <div className={t1.codeLabel}>
          {t('landing.redesign.auth.telegram.yourCode')}
        </div>
        <div className={t1.codeValue}>
          {verificationCode ?? '——————'}
        </div>
        <div className={t1.codeNote}>
          {isExpired
            ? t('landing.redesign.auth.telegram.expired')
            : t('landing.redesign.auth.telegram.codeExpires')}
        </div>
      </div>

      {isExpired ? (
        <button
          type="button"
          className={s.btnPrimary}
          onClick={onRefreshCode}
          disabled={isRefreshing}
        >
          {t('landing.redesign.auth.telegram.refreshCode')}
        </button>
      ) : (
        <a
          href={botUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${s.btnPrimary} ${t1.btnLink}`}
          aria-disabled={!verificationCode}
        >
          <TelegramIcon />
          {t('landing.redesign.auth.telegram.openBot')}
        </a>
      )}

      <div className={t1.howItWorks}>
        <div className={t1.howTitle}>
          {t('landing.redesign.auth.telegram.howItWorks')}
        </div>
        <div className={t1.howStep}>{t('landing.redesign.auth.telegram.step1')}</div>
        <div className={t1.howStep}>{t('landing.redesign.auth.telegram.step2')}</div>
        <div className={t1.howStep}>{t('landing.redesign.auth.telegram.step3')}</div>
      </div>

      <div className={t1.waiting} aria-live="polite">
        <div className={t1.spinner} aria-hidden="true" />
        {t('landing.redesign.auth.telegram.waiting')}
      </div>

      <button type="button" className={s.btnGhost} onClick={onSkip}>
        {t('landing.redesign.auth.telegram.skip')}
      </button>
      <div className={t1.skipNote}>
        {t('landing.redesign.auth.telegram.skipNote')}
      </div>
    </>
  );
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
    </svg>
  );
}
