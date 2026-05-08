/**
 * SafetySection — Безопасность.
 * Side: text-right, mockup+fluffy left.
 * BG: light blue pastel (#DBEEFF) / dark navy (#0F1B2E).
 */

import { ShieldCheck } from 'lucide-react';
import FeatureSection from './FeatureSection';
import { useLanguage } from '../../i18n';
import phoneImg from '../../assets/landing/safety-phone-mockup-removebg-preview.png';
// Файл назван "heart-purple", но содержит shield+checkmark — для Safety
import fluffyImg from '../../assets/landing/fluffy-heart-purple-removebg-preview.png';

export default function SafetySection() {
  const { t } = useLanguage();
  return (
    <FeatureSection
      side="right"
      bg="#DBEEFF"
      bgDark="#0F1B2E"
      bgNext="#FFFFFF"
      bgNextDark="#13121A"
      phoneBg="linear-gradient(180deg, #FFFFFF 0%, #E8F1FF 100%)"
      fluffyColor="radial-gradient(circle at 35% 30%, #93C5FD 0%, #3B82F6 75%)"
      fluffyIcon={<ShieldCheck size={56} fill="#FFFFFF" stroke="#3B82F6" strokeWidth={2.5} />}
      title={t('landing.redesign.safety.title')}
      subtitle={t('landing.redesign.safety.subtitle')}
      ctaLabel={t('landing.redesign.safety.ctaLabel')}
      ctaHref="/auth"
      phoneCaption={t('landing.redesign.safety.phoneCaption')}
      phoneButtonLabel={t('landing.redesign.safety.phoneButtonLabel')}
      phoneImageSrc={phoneImg}
      fluffyImageSrc={fluffyImg}
    />
  );
}
