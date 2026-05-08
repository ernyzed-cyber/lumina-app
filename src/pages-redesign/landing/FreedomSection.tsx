/**
 * FreedomSection — Легко быть собой.
 * Side: text-left, mockup+fluffy right.
 * BG: lavender pastel / deep purple.
 */

import { Hash } from 'lucide-react';
import FeatureSection from './FeatureSection';
import { useLanguage } from '../../i18n';
import phoneImg from '../../assets/landing/freedom-phone-mockup-removebg-preview.png';
import fluffyImg from '../../assets/landing/fluffy-hashtag-violet-removebg-preview.png';

export default function FreedomSection() {
  const { t } = useLanguage();
  return (
    <FeatureSection
      side="left"
      bg="#EDE3FF"
      bgDark="#1A0F2E"
      bgNext="#0F0E13" /* переход к тёмному манифесту — одинаковый для light/dark */
      bgNextDark="#0F0E13"
      phoneBg="linear-gradient(180deg, #FFFFFF 0%, #EDE3FF 100%)"
      fluffyColor="radial-gradient(circle at 35% 30%, #C4B5FD 0%, #8B5CF6 75%)"
      fluffyIcon={<Hash size={56} fill="#FFFFFF" stroke="#8B5CF6" strokeWidth={2.5} />}
      title={t('landing.redesign.freedom.title')}
      subtitle={t('landing.redesign.freedom.subtitle')}
      ctaLabel={t('landing.redesign.freedom.ctaLabel')}
      ctaHref="/auth"
      phoneCaption={t('landing.redesign.freedom.phoneCaption')}
      phoneButtonLabel={t('landing.redesign.freedom.phoneButtonLabel')}
      waveBottom={false} /* следующая секция тёмная — wave не нужна */
      phoneImageSrc={phoneImg}
      fluffyImageSrc={fluffyImg}
    />
  );
}
