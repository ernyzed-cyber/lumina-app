/**
 * Landing — главная маркетинговая страница (Stage 3 редизайна, итерация 3).
 *
 * Композиция (Mamba × Lumina гибрид):
 *   1. HeroSection         — тёмный, brand-gradient, Lumina-character (editorial)
 *   2. HowItWorksSection   — мост: 3 принципа Lumina (моногамия / характер / ставки)
 *   3. SafetySection       — light blue pastel · text-right · phone-left
 *   4. SearchSection       — white · text-left · phone-right
 *   5. ChatSection         — pink pastel · text-right · phone-left
 *   6. FreedomSection      — lavender pastel · text-left · phone-right
 *   7. ManifestoSection    — тёмный мост, 4 принципа, gradient акценты
 *   8. FinalCtaSection     — full-bleed gradient, лого + сторы + footer
 *
 * Все тексты — через i18n (landing.redesign.*), default lang = en, fallback = en.
 * Изображения — placeholder; raw файлы кладутся в src/assets/landing/.
 */

import HeroSection from './landing/HeroSection';
import HowItWorksSection from './landing/HowItWorksSection';
import SafetySection from './landing/SafetySection';
import SearchSection from './landing/SearchSection';
import ChatSection from './landing/ChatSection';
import FreedomSection from './landing/FreedomSection';
import ManifestoSection from './landing/ManifestoSection';
import FinalCtaSection from './landing/FinalCtaSection';
import s from './Landing.module.css';

export default function Landing() {
  return (
    <div className={s.root}>
      <HeroSection howItWorksId="how-it-works" />
      <HowItWorksSection id="how-it-works" />
      <SafetySection />
      <SearchSection />
      <ChatSection />
      <FreedomSection />
      <ManifestoSection />
      <FinalCtaSection />
    </div>
  );
}
