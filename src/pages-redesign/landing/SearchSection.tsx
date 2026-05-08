/**
 * SearchSection — Та, что подходит именно тебе.
 * Side: text-left, mockup+fluffy right.
 * BG: white / very dark violet-tinted.
 */

import { KeyRound } from 'lucide-react';
import FeatureSection from './FeatureSection';
import { useLanguage } from '../../i18n';
import phoneImg from '../../assets/landing/search-phone-mockup-removebg-preview.png';
import fluffyImg from '../../assets/landing/fluffy-key-pink-removebg-preview.png';

export default function SearchSection() {
  const { t } = useLanguage();
  return (
    <FeatureSection
      side="left"
      bg="#FFFFFF"
      bgDark="#13121A"
      bgNext="#FBDFEC"
      bgNextDark="#2A0E1F"
      phoneBg="linear-gradient(180deg, #EDE3FF 0%, #C4B5FD 100%)"
      fluffyColor="radial-gradient(circle at 35% 30%, #FBB9DF 0%, #EC4899 75%)"
      fluffyIcon={<KeyRound size={56} fill="#FFFFFF" stroke="#EC4899" strokeWidth={2.5} />}
      title={t('landing.redesign.search.title')}
      subtitle={t('landing.redesign.search.subtitle')}
      ctaLabel={t('landing.redesign.search.ctaLabel')}
      ctaHref="/auth"
      phoneCaption={t('landing.redesign.search.phoneCaption')}
      phoneButtonLabel={t('landing.redesign.search.phoneButtonLabel')}
      phoneImageSrc={phoneImg}
      fluffyImageSrc={fluffyImg}
    />
  );
}
