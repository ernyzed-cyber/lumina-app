import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import {
  Heart,
  MapPin,
  RotateCcw,
  MessageCircle,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import PageTransition from '../components/layout/PageTransition';
import FilterPanel from '../components/filters/FilterPanel';
import GirlProfileDrawer, { type GirlProfileLabels } from '../components/GirlProfile/GirlProfileDrawer';
import { useAuth } from '../hooks/useAuth';
import { useAssignment } from '../hooks/useAssignment';
import { useTelegramVerified } from '../hooks/useTelegramVerified';
import { useLanguage } from '../i18n';
import { getLocalizedGirls, type Girl } from '../data/girls';
import type { FilterState } from '../types/filters';
import { DEFAULT_FILTERS } from '../types/filters';
import { storage } from '../utils/helpers';
import VerificationModal from '../components/VerificationModal';
import s from './Feed.module.css';

/* ── Constants ── */
const SWIPE_THRESHOLD = 120;
const SWIPE_UP_THRESHOLD = 100;
const ROTATION_FACTOR = 15;
const MATCH_DELAY_MIN = 2000;
const MATCH_DELAY_MAX = 5000;

const FILTERS_KEY = 'feedFilters';

/* ── Filter matching ── */
function matchesFilters(girl: Girl, f: FilterState): boolean {
  if (f.verifiedOnly && !girl.verified) return false;
  if (f.onlineOnly && !girl.online) return false;
  if (girl.age < f.age.min || girl.age > f.age.max) return false;
  if (girl.distance > f.distance) return false;
  if (girl.appearance.height < f.height.min || girl.appearance.height > f.height.max) return false;
  if (f.weight.min > 40 || f.weight.max < 120) {
    const w = girl.appearance.weight;
    if (w && (w < f.weight.min || w > f.weight.max)) return false;
  }
  if (f.goals.length > 0 && !girl.goals.some(g => f.goals.includes(g))) return false;
  if (f.education.length > 0 && !f.education.includes(girl.education)) return false;
  if (f.children.length > 0 && !f.children.includes(girl.lifestyle.children)) return false;
  if (f.smoking.length > 0 && !f.smoking.includes(girl.lifestyle.smoking)) return false;
  if (f.alcohol.length > 0 && !f.alcohol.includes(girl.lifestyle.alcohol)) return false;
  if (f.bodyType.length > 0 && girl.appearance.bodyType && !f.bodyType.includes(girl.appearance.bodyType)) return false;
  if (f.zodiac.length > 0 && girl.appearance.zodiac && !f.zodiac.includes(girl.appearance.zodiac)) return false;
  if (f.wealth.length > 0 && !f.wealth.includes(girl.wealth)) return false;
  if (f.living.length > 0 && !f.living.includes(girl.living)) return false;
  return true;
}

/* ── Confetti Component (mount-once random positions) ── */
const CONFETTI_COLORS = ['#8B5CF6', '#EC4899', '#F43F5E', '#FBBF24', '#34D399'];
interface ConfettiDot {
  left: string;
  animationDelay: string;
  animationDuration: string;
  backgroundColor: string;
}
function MatchConfetti({ className, dotClassName }: { className: string; dotClassName: string }) {
  const [dots, setDots] = useState<ConfettiDot[]>([]);
  useEffect(() => {
    setDots(
      Array.from({ length: 20 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 0.5}s`,
        animationDuration: `${1 + Math.random()}s`,
        backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    );
  }, []);
  return (
    <div className={className}>
      {dots.map((style, i) => (
        <span key={i} className={dotClassName} style={style} />
      ))}
    </div>
  );
}

/* ── Swipe Card Component ── */
interface SwipeCardProps {
  girl: Girl;
  isTop: boolean;
  onSwipe: (dir: 'left' | 'right' | 'up') => void;
  onTap: () => void;
  triggerSwipe: 'left' | 'right' | 'up' | null;
  onTriggerComplete: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  shouldReduceMotion: boolean | null;
}

function SwipeCard({ girl, isTop, onSwipe, onTap, triggerSwipe, onTriggerComplete, t, shouldReduceMotion }: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-ROTATION_FACTOR, 0, ROTATION_FACTOR]);
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-SWIPE_UP_THRESHOLD, 0], [1, 0]);

  const [exiting, setExiting] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  /* Handle programmatic swipe via buttons */
  useEffect(() => {
    if (!triggerSwipe || !isTop) return;

    setExiting(true);
    const exitX = triggerSwipe === 'right' ? 600 : triggerSwipe === 'left' ? -600 : 0;
    const exitY = triggerSwipe === 'up' ? -600 : 0;

    x.set(exitX);
    y.set(exitY);

    const timer = setTimeout(() => {
      onSwipe(triggerSwipe);
      onTriggerComplete();
    }, 300);
    return () => clearTimeout(timer);
  }, [triggerSwipe, isTop, onSwipe, onTriggerComplete, x, y]);

  function handleDragStart(_: unknown, info: PanInfo) {
    dragStartRef.current = { x: info.point.x, y: info.point.y };
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;

    // Swipe up = superlike
    if (offset.y < -SWIPE_UP_THRESHOLD || velocity.y < -500) {
      setExiting(true);
      onSwipe('up');
      return;
    }

    // Swipe right = like
    if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      setExiting(true);
      onSwipe('right');
      return;
    }

    // Swipe left = nope
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      setExiting(true);
      onSwipe('left');
      return;
    }

    // Treat as tap if barely moved
    if (dragStartRef.current) {
      const dx = Math.abs(info.point.x - dragStartRef.current.x);
      const dy = Math.abs(info.point.y - dragStartRef.current.y);
      if (dx < 8 && dy < 8) {
        onTap();
      }
    }
  }

  return (
    <motion.div
      className={`${s.swipeCard} ${isTop ? s.swipeCardTop : ''}`}
      style={
        isTop
          ? { x, y, rotate, zIndex: 10 }
          : { scale: 0.95, y: 10, zIndex: 5, opacity: 0.7 }
      }
      drag={isTop && !exiting && !shouldReduceMotion ? 'x' : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragStart={isTop && !shouldReduceMotion ? handleDragStart : undefined}
      onDragEnd={isTop && !shouldReduceMotion ? handleDragEnd : undefined}
      initial={shouldReduceMotion ? { opacity: isTop ? 1 : 0.7 } : { scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.7 }}
      animate={
        exiting
          ? {}
          : isTop
            ? shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }
            : shouldReduceMotion ? { opacity: 0.7 } : { scale: 0.95, opacity: 0.7, y: 10 }
      }
      exit={
        exiting
          ? { opacity: 0, transition: { duration: shouldReduceMotion ? 0.1 : 0.3 } }
          : { opacity: 0, transition: { duration: shouldReduceMotion ? 0 : 0.2 } }
      }
      transition={shouldReduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Photo */}
      <img
        src={girl.photo}
        alt={girl.name}
        className={s.swipeCardImage}
        draggable={false}
      />

      {/* "..." menu button */}
      <button className={s.cardMenuBtn} type="button" aria-label="Menu" onClick={e => { e.stopPropagation(); onTap(); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {/* Gradient overlay */}
      <div className={s.swipeCardOverlay}>
        <div className={s.swipeCardInfo}>
          <div className={s.swipeCardNameRow}>
            <span className={s.swipeCardName}>{girl.name},</span>
            <span className={s.swipeCardAge}>{girl.age}</span>
            {girl.verified && (
              <svg className={s.verifiedBadge} width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#3B82F6" />
                <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className={s.swipeCardCity}>
            <MapPin size={14} />
            {girl.city}
          </span>
          <p className={s.swipeCardBio}>{girl.bio}</p>
          {girl.tags.length > 0 && (
            <div className={s.swipeCardTags}>
              {girl.tags.slice(0, 4).map((tag) => (
                <span key={tag} className={s.swipeCardTag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Swipe indicators */}
      {isTop && (
        <>
          <motion.div className={`${s.swipeLabel} ${s.swipeLabelLike}`} style={{ opacity: likeOpacity }}>
            {t('feed.swipeLike')}
          </motion.div>
          <motion.div className={`${s.swipeLabel} ${s.swipeLabelNope}`} style={{ opacity: nopeOpacity }}>
            {t('feed.swipeNope')}
          </motion.div>
          <motion.div className={`${s.swipeLabel} ${s.swipeLabelSuper}`} style={{ opacity: superLikeOpacity }}>
            {t('feed.swipeSuper')}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

/* ── Main Feed Component ── */
export default function Feed() {
  const { user, loading: authLoading } = useAuth();
  const { isVerified: telegramVerified } = useTelegramVerified();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  /* ── Assignment (единый источник истины: activeGirlId + takenGirlIds) ── */
  const {
    activeGirlId,
    loading: assignmentLoading,
    createAssignment,
    isOnWaitlist,
    joinWaitlist,
    takenGirlIds,
    takenLoading,
  } = useAssignment();

  /* Redirect если уже есть девушка */
  useEffect(() => {
    if (!assignmentLoading && activeGirlId) {
      navigate('/chat', { replace: true });
    }
  }, [activeGirlId, assignmentLoading, navigate]);

  /* ── Localized girls data ── */
  const allGirls = useMemo(() => getLocalizedGirls(lang), [lang]);

  /* ── Filters ── */
  const [filters, setFilters] = useState<FilterState>(() =>
    storage.load<FilterState>(FILTERS_KEY, null) ?? DEFAULT_FILTERS,
  );
  const [filterOpen, setFilterOpen] = useState(false);

  const girls = useMemo(
    () => allGirls.filter(g => matchesFilters(g, filters) && !takenGirlIds.has(g.id)),
    [allGirls, filters, takenGirlIds],
  );

  /* ── Persist filters ── */
  useEffect(() => {
    storage.save(FILTERS_KEY, filters);
  }, [filters]);

  /* ── GirlProfileDrawer ── */
  const [selectedGirl, setSelectedGirl] = useState<Girl | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback((girl: Girl) => {
    setSelectedGirl(girl);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  /* Card stack */
  const [currentIndex, setCurrentIndex] = useState(0);

  /* Match animation */
  const [matchGirl, setMatchGirl] = useState<Girl | null>(null);

  /* Button-triggered swipe */
  const [triggerSwipe, setTriggerSwipe] = useState<'left' | 'right' | 'up' | null>(null);

  /* Verification modal */
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  /* Reset index when filters change */
  useEffect(() => {
    setCurrentIndex(0);
  }, [filters]);

  /* ── Auth guard handled by ProtectedRoute — no duplicate needed ── */

  /* ── Remaining cards ── */
  const remainingGirls = girls.slice(currentIndex);
  const topTwo = remainingGirls.slice(0, 2);
  const isOutOfCards = remainingGirls.length === 0;

  /* ── Handle swipe ── */
  const handleSwipe = useCallback(
    async (dir: 'left' | 'right' | 'up') => {
      const girl = girls[currentIndex];
      if (!girl) return;

      /* Block likes/superLikes for unverified users */
      if ((dir === 'right' || dir === 'up') && telegramVerified === false) {
        return;
      }

      if (dir === 'right' || dir === 'up') {
        // Создаём assignment
        const { error: aError } = await createAssignment(girl.id);
        if (aError === 'girl_taken') {
          setCurrentIndex((prev) => prev + 1);
          return;
        }
        if (!aError) {
          const delay = MATCH_DELAY_MIN + Math.random() * (MATCH_DELAY_MAX - MATCH_DELAY_MIN);
          setTimeout(() => {
            setMatchGirl(girl);
          }, delay);
        }
      }

      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex, createAssignment, girls, telegramVerified],
  );

  /* ── Reset deck ── */
  function resetDeck() {
    setCurrentIndex(0);
  }

  /* ── Close match overlay ── */
  function closeMatch() {
    setMatchGirl(null);
    navigate('/chat', { replace: true });
  }

  /* ── Filter panel labels ── */
  const filterLabels = useMemo(() => ({
    title: t('filters.title'),
    reset: t('filters.reset'),
    apply: t('filters.apply'),
    age: t('filters.age'),
    height: t('filters.height'),
    weight: t('filters.weight'),
    distance: t('filters.distance'),
    goals: t('filters.goals'),
    education: t('filters.education'),
    children: t('filters.children'),
    smoking: t('filters.smoking'),
    alcohol: t('filters.alcohol'),
    bodyType: t('filters.bodyType'),
    zodiac: t('filters.zodiac'),
    wealth: t('filters.wealth'),
    living: t('filters.living'),
    verifiedOnly: t('filters.verifiedOnly'),
    onlineOnly: t('filters.onlineOnly'),
    km: t('filters.km'),
    cm: t('filters.cm'),
    kg: t('filters.kg'),
    goalOptions: [
      { value: 'serious' as const, label: t('filters.goalSerious') },
      { value: 'friendship' as const, label: t('filters.goalFriendship') },
      { value: 'flirt' as const, label: t('filters.goalFlirt') },
      { value: 'undecided' as const, label: t('filters.goalUndecided') },
    ],
    educationOptions: [
      { value: 'school' as const, label: t('filters.eduSchool') },
      { value: 'college' as const, label: t('filters.eduCollege') },
      { value: 'bachelor' as const, label: t('filters.eduBachelor') },
      { value: 'master' as const, label: t('filters.eduMaster') },
      { value: 'phd' as const, label: t('filters.eduPhd') },
    ],
    childrenOptions: [
      { value: 'none' as const, label: t('filters.childrenNone') },
      { value: 'has' as const, label: t('filters.childrenHas') },
      { value: 'want' as const, label: t('filters.childrenWant') },
      { value: 'dontWant' as const, label: t('filters.childrenDontWant') },
    ],
    smokingOptions: [
      { value: 'no' as const, label: t('filters.smokingNo') },
      { value: 'sometimes' as const, label: t('filters.smokingSometimes') },
      { value: 'yes' as const, label: t('filters.smokingYes') },
    ],
    alcoholOptions: [
      { value: 'no' as const, label: t('filters.alcoholNo') },
      { value: 'sometimes' as const, label: t('filters.alcoholSometimes') },
      { value: 'yes' as const, label: t('filters.alcoholYes') },
    ],
    bodyTypeOptions: [
      { value: 'slim' as const, label: t('filters.bodySlim') },
      { value: 'athletic' as const, label: t('filters.bodyAthletic') },
      { value: 'average' as const, label: t('filters.bodyAverage') },
      { value: 'curvy' as const, label: t('filters.bodyCurvy') },
      { value: 'plus' as const, label: t('filters.bodyPlus') },
    ],
    zodiacOptions: [
      { value: 'aries' as const, label: t('filters.zodiacAries') },
      { value: 'taurus' as const, label: t('filters.zodiacTaurus') },
      { value: 'gemini' as const, label: t('filters.zodiacGemini') },
      { value: 'cancer' as const, label: t('filters.zodiacCancer') },
      { value: 'leo' as const, label: t('filters.zodiacLeo') },
      { value: 'virgo' as const, label: t('filters.zodiacVirgo') },
      { value: 'libra' as const, label: t('filters.zodiacLibra') },
      { value: 'scorpio' as const, label: t('filters.zodiacScorpio') },
      { value: 'sagittarius' as const, label: t('filters.zodiacSagittarius') },
      { value: 'capricorn' as const, label: t('filters.zodiacCapricorn') },
      { value: 'aquarius' as const, label: t('filters.zodiacAquarius') },
      { value: 'pisces' as const, label: t('filters.zodiacPisces') },
    ],
    wealthOptions: [
      { value: 'stable' as const, label: t('filters.wealthStable') },
      { value: 'average' as const, label: t('filters.wealthAverage') },
      { value: 'wealthy' as const, label: t('filters.wealthWealthy') },
    ],
    livingOptions: [
      { value: 'own' as const, label: t('filters.livingOwn') },
      { value: 'rent' as const, label: t('filters.livingRent') },
      { value: 'parents' as const, label: t('filters.livingParents') },
    ],
  }), [t]);

  /* ── GirlProfileDrawer labels ── */
  const drawerLabels: GirlProfileLabels = useMemo(() => ({
    datingGoal: t('girlProfile.datingGoal'),
    lookingForMale: t('girlProfile.lookingForMale'),
    lookingForFemale: t('girlProfile.lookingForFemale'),
    lookingForAny: t('girlProfile.lookingForAny'),
    age: t('girlProfile.age'),
    aboutMe: t('girlProfile.aboutMe'),
    education: t('girlProfile.education'),
    languages: t('girlProfile.languages'),
    lifestyle: t('girlProfile.lifestyle'),
    appearance: t('girlProfile.appearance'),
    height: t('girlProfile.height'),
    weight: t('girlProfile.weight'),
    compatibility: t('girlProfile.compatibility'),
    checkCommon: t('girlProfile.checkCommon'),
    morePhotos: t('girlProfile.morePhotos'),
    km: t('filters.km'),
    cm: t('filters.cm'),
    kg: t('filters.kg'),
    goalSerious: t('filters.goalSerious'),
    goalFriendship: t('filters.goalFriendship'),
    goalFlirt: t('filters.goalFlirt'),
    goalUndecided: t('filters.goalUndecided'),
    eduSchool: t('filters.eduSchool'),
    eduCollege: t('filters.eduCollege'),
    eduBachelor: t('filters.eduBachelor'),
    eduMaster: t('filters.eduMaster'),
    eduPhd: t('filters.eduPhd'),
    eduNone: t('filters.eduNone'),
    work: t('girlProfile.work'),
    children: t('filters.children'),
    alcohol: t('filters.alcohol'),
    smoking: t('filters.smoking'),
    childrenNone: t('filters.childrenNone'),
    childrenHas: t('filters.childrenHas'),
    childrenWant: t('filters.childrenWant'),
    childrenDontWant: t('filters.childrenDontWant'),
    alcoholNo: t('filters.alcoholNo'),
    alcoholSometimes: t('filters.alcoholSometimes'),
    alcoholYes: t('filters.alcoholYes'),
    smokingNo: t('filters.smokingNo'),
    smokingSometimes: t('filters.smokingSometimes'),
    smokingYes: t('filters.smokingYes'),
    zodiacAries: t('filters.zodiacAries'),
    zodiacTaurus: t('filters.zodiacTaurus'),
    zodiacGemini: t('filters.zodiacGemini'),
    zodiacCancer: t('filters.zodiacCancer'),
    zodiacLeo: t('filters.zodiacLeo'),
    zodiacVirgo: t('filters.zodiacVirgo'),
    zodiacLibra: t('filters.zodiacLibra'),
    zodiacScorpio: t('filters.zodiacScorpio'),
    zodiacSagittarius: t('filters.zodiacSagittarius'),
    zodiacCapricorn: t('filters.zodiacCapricorn'),
    zodiacAquarius: t('filters.zodiacAquarius'),
    zodiacPisces: t('filters.zodiacPisces'),
    bodySlim: t('filters.bodySlim'),
    bodyAthletic: t('filters.bodyAthletic'),
    bodyAverage: t('filters.bodyAverage'),
    bodyCurvy: t('filters.bodyCurvy'),
    bodyPlus: t('filters.bodyPlus'),
    giftsTitle: t('profile.gifts.sectionTitle'),
  }), [t]);

  /* ── Loading state ── */
  if (authLoading || assignmentLoading || takenLoading) {
    return (
      <div className={s.page}>
        <Navbar />
        <main className={s.main} id="main-content" role="main" aria-label={t('feed.ariaLabel')}>
          <div className={s.loading}>
            <div className={s.loadingSpinner} />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />

        <main className={s.main} id="main-content" role="main" aria-label={t('feed.ariaLabel')}>
          <div className={s.swipeContainer}>
              {/* ── Header ── */}
              <div className={s.swipeHeader}>
                <h1 className={s.swipeTitle}>{t('feed.tabs.dating')}</h1>
                <button
                  className={s.filterBtn}
                  onClick={() => setFilterOpen(true)}
                  type="button"
                  aria-label={t('filters.title')}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <line x1="11" y1="18" x2="13" y2="18" />
                  </svg>
                </button>
              </div>

              {/* ── Card Stack ── */}
              <div className={s.cardStack}>
                {allGirls.filter(g => matchesFilters(g, filters) && !takenGirlIds.has(g.id)).length === 0 && takenGirlIds.size > 0 ? (
                  <div className={s.emptyStack}>
                    <div className={s.emptyIcon}>
                      <Heart size={48} strokeWidth={1.5} />
                    </div>
                    <h3 className={s.emptyTitle}>Все девушки заняты</h3>
                    <p className={s.emptyText}>
                      Как только кто-то освободится — мы тебе сообщим.
                    </p>
                    <button className={s.resetBtn} onClick={isOnWaitlist ? undefined : joinWaitlist} disabled={isOnWaitlist}>
                      {isOnWaitlist ? 'Ты уже в очереди' : 'Встать в очередь'}
                    </button>
                  </div>
                ) : isOutOfCards ? (
                  <div className={s.emptyStack}>
                    <div className={s.emptyIcon}>
                      <Heart size={48} strokeWidth={1.5} />
                    </div>
                    <h3 className={s.emptyTitle}>{t('feed.emptyTitle')}</h3>
                    <p className={s.emptyText}>
                      {t('feed.emptyText')}
                    </p>
                    <button className={s.resetBtn} onClick={resetDeck}>
                      <RotateCcw size={16} />
                      {t('feed.resetBtn')}
                    </button>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {topTwo.map((girl, i) => (
                      <SwipeCard
                        key={girl.id}
                        girl={girl}
                        isTop={i === 0}
                        onSwipe={handleSwipe}
                        onTap={() => openDrawer(girl)}
                        triggerSwipe={i === 0 ? triggerSwipe : null}
                        onTriggerComplete={() => setTriggerSwipe(null)}
                        t={t}
                        shouldReduceMotion={shouldReduceMotion}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* ── Verification banner for unverified users ── */}
              {telegramVerified === false && !isOutOfCards && (
                <div className={s.verificationBanner}>
                  <span>{t('verification.likesBlocked')}</span>
                  <button
                    type="button"
                    className={s.verifyNowBtn}
                    onClick={() => setVerifyModalOpen(true)}
                  >
                    {t('verification.verifyBtn')}
                  </button>
                </div>
              )}

              {/* ── Action Buttons (new design: chat / heart / fire) ── */}
              {!isOutOfCards && (
                <div className={s.actionButtons}>
                  <motion.button
                    className={`${s.actionBtn} ${s.actionBtnChat}`}
                    onClick={async () => {
                      const girl = girls[currentIndex];
                      if (!girl) return;
                      if (telegramVerified === false) return;
                      const { error: aError } = await createAssignment(girl.id);
                      if (!aError) navigate('/chat', { replace: true });
                      else if (aError === 'girl_taken') setCurrentIndex((prev) => prev + 1);
                    }}
                    aria-label={t('feed.sendMessage')}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <MessageCircle size={24} />
                  </motion.button>

                  <motion.button
                    className={`${s.actionBtn} ${s.actionBtnLike}`}
                    onClick={() => {
                      if (telegramVerified === false) return;
                      setTriggerSwipe('right');
                    }}
                    disabled={telegramVerified === false}
                    aria-label={t('feed.likeAriaLabel')}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.12 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Heart size={28} />
                  </motion.button>

                  <motion.button
                    className={`${s.actionBtn} ${s.actionBtnFire}`}
                    onClick={() => {
                      if (telegramVerified === false) return;
                      setTriggerSwipe('up');
                    }}
                    disabled={telegramVerified === false}
                    aria-label={t('feed.superLikeAriaLabel')}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.12 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="url(#feedFireGrad)">
                      <defs>
                        <linearGradient id="feedFireGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#F97316" />
                          <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                      </defs>
                      <path d="M12 2c.5 4-2 6-2 10 0 2.5 2 4 4 4s4-1.5 4-4c0-6-6-10-6-10zm-2 16c-1.5 0-3-1-3-3 0-2 1.5-3 3-4 1.5 1 3 2 3 4s-1.5 3-3 3z" />
                    </svg>
                  </motion.button>
                </div>
              )}
            </div>
        </main>

        {/* ── Match Overlay ── */}
        <AnimatePresence>
          {matchGirl && (
            <motion.div
              className={s.matchOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={closeMatch}
            >
              <motion.div
                className={s.matchContent}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Confetti dots */}
                <MatchConfetti className={s.confetti} dotClassName={s.confettiDot} />

                <div className={s.matchIcon}>
                  <Heart size={40} fill="currentColor" />
                </div>

                <h2 className={s.matchTitle}>{t('feed.matchTitle')}</h2>
                <p className={s.matchSubtitle}>
                  {t('feed.matchSubtitle', { name: matchGirl.name })}
                </p>

                <img
                  src={matchGirl.photo}
                  alt={matchGirl.name}
                  className={s.matchPhoto}
                />

                <button className={s.matchChatBtn} onClick={closeMatch}>
                  <MessageCircle size={18} />
                  {t('feed.sendMessage')}
                </button>

                <button
                  className={s.matchSkipBtn}
                  onClick={() => setMatchGirl(null)}
                >
                  {t('feed.keepSwiping')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Verification Modal ── */}
        <VerificationModal
          open={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
        />

        {/* ── Filter Panel ── */}
        <FilterPanel
          open={filterOpen}
          filters={filters}
          onApply={setFilters}
          onClose={() => setFilterOpen(false)}
          t={filterLabels}
        />

        {/* ── Girl Profile Drawer ── */}
        <GirlProfileDrawer
          open={drawerOpen}
          girl={selectedGirl}
          onClose={closeDrawer}
          t={drawerLabels}
          onChat={(_g) => {
            // В концепции 1:1 кнопка "написать" в drawer тоже создаёт assignment
            closeDrawer();
          }}
          onLike={async (g) => {
            if (telegramVerified === false) {
              closeDrawer();
              setVerifyModalOpen(true);
              return;
            }
            const { error: aError } = await createAssignment(g.id);
            closeDrawer();
            if (!aError) {
              const delay = MATCH_DELAY_MIN + Math.random() * (MATCH_DELAY_MAX - MATCH_DELAY_MIN);
              setTimeout(() => setMatchGirl(g), delay);
            }
          }}
          onSuperLike={async (g) => {
            if (telegramVerified === false) {
              closeDrawer();
              setVerifyModalOpen(true);
              return;
            }
            const { error: aError } = await createAssignment(g.id);
            closeDrawer();
            if (!aError) {
              setTimeout(() => setMatchGirl(g), 1500);
            }
          }}
        />
      </div>
    </PageTransition>
  );
}
