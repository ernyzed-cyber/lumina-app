/**
 * ChatSection — Не просто матчи, живое общение.
 * Side: text-right, mockup+fluffy left.
 * BG: soft pink pastel / dark wine.
 */

import { Heart } from 'lucide-react';
import FeatureSection from './FeatureSection';
import { useLanguage } from '../../i18n';
import phoneImg from '../../assets/landing/chat-phone-mockup-removebg-preview.png';
// fluffy-shield-pink на самом деле — фиолетовый плюш с белым сердцем
import fluffyImg from '../../assets/landing/fluffy-shield-pink-removebg-preview.png';

export default function ChatSection() {
  const { t } = useLanguage();
  return (
    <FeatureSection
      side="right"
      bg="#FBDFEC"
      bgDark="#2A0E1F"
      bgNext="#EDE3FF"
      bgNextDark="#1A0F2E"
      phoneBg="linear-gradient(180deg, #FFFFFF 0%, #FBDFEC 100%)"
      fluffyColor="radial-gradient(circle at 35% 30%, #F9A8D4 0%, #EC4899 70%)"
      fluffyIcon={<Heart size={56} fill="#FFFFFF" stroke="#EC4899" strokeWidth={2.5} />}
      title={t('landing.redesign.chat.title')}
      subtitle={t('landing.redesign.chat.subtitle')}
      ctaLabel={t('landing.redesign.chat.ctaLabel')}
      ctaHref="/auth"
      phoneCaption={t('landing.redesign.chat.phoneCaption')}
      phoneButtonLabel={t('landing.redesign.chat.phoneButtonLabel')}
      phoneImageSrc={phoneImg}
      fluffyImageSrc={fluffyImg}
    />
  );
}
