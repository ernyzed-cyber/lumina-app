import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import PageTransition from '../components/layout/PageTransition';
import FilterPanel from '../components/filters/FilterPanel';
import GirlProfileDrawer, { type GirlProfileLabels } from '../components/GirlProfile/GirlProfileDrawer';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n';
import { getLocalizedGirls, type Girl } from '../data/girls';
import type { FilterState } from '../types/filters';
import { DEFAULT_FILTERS } from '../types/filters';
import { storage } from '../utils/helpers';
import s from './Search.module.css';

const FILTERS_KEY = 'searchFilters';
const PROMO_POSITIONS = [0, 5];

/* ── Filter matching (same logic as Feed) ── */
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

type GridItem =
  | { type: 'girl'; girl: Girl }
  | { type: 'promo'; variant: 'boost' | 'views' };

export default function Search() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const allGirls = useMemo(() => getLocalizedGirls(lang), [lang]);

  /* ── Filters ── */
  const [filters, setFilters] = useState<FilterState>(() =>
    storage.load<FilterState>(FILTERS_KEY, null) ?? DEFAULT_FILTERS,
  );
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    storage.save(FILTERS_KEY, filters);
  }, [filters]);

  const girls = useMemo(
    () => allGirls.filter((g) => matchesFilters(g, filters)),
    [allGirls, filters],
  );

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

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  /* ── Build grid with promo cards inserted ── */
  const gridItems = useMemo<GridItem[]>(() => {
    const items: GridItem[] = [];
    let girlIdx = 0;
    let promoIdx = 0;
    let pos = 0;

    while (girlIdx < girls.length || promoIdx < PROMO_POSITIONS.length) {
      if (promoIdx < PROMO_POSITIONS.length && pos === PROMO_POSITIONS[promoIdx]) {
        items.push({ type: 'promo', variant: promoIdx === 0 ? 'boost' : 'views' });
        promoIdx++;
        pos++;
      } else if (girlIdx < girls.length) {
        items.push({ type: 'girl', girl: girls[girlIdx] });
        girlIdx++;
        pos++;
      } else {
        promoIdx++; // skip remaining promos if no more girls
      }
    }
    return items;
  }, [girls]);

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
  }), [t]);

  if (authLoading || !user) return null;

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />

        <main className={s.main} id="main-content" role="main" aria-label={t('feed.tabs.search')}>
          <div className={s.searchContainer}>
            {/* ── Header ── */}
            <div className={s.searchHeader}>
              <h1 className={s.searchTitle}>{t('feed.tabs.search')}</h1>
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

            {/* ── Gallery Grid ── */}
            <div className={s.galleryGrid}>
              {gridItems.length === 0 ? (
                <div className={s.galleryEmpty}>
                  <div className={s.galleryEmptyIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>
                  <h3 className={s.galleryEmptyTitle}>{t('feed.noResults')}</h3>
                  <p className={s.galleryEmptyText}>{t('feed.noResultsText')}</p>
                </div>
              ) : (
                gridItems.map((item) => {
                  if (item.type === 'promo') {
                    const isBoost = item.variant === 'boost';
                    return (
                      <div
                        key={`promo-${item.variant}`}
                        className={`${s.promoCard} ${isBoost ? s.promoCardPink : s.promoCardPurple}`}
                        onClick={() => navigate('/premium')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className={s.promoIcon}>
                          {isBoost ? (
                            /* Arrow up / boost icon */
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 3l-1.4 1.4L16.2 10H4v2h12.2l-5.6 5.6L12 19l8-8z" />
                              <path d="M12 3l-1.4 1.4L16.2 10H4v2h12.2l-5.6 5.6L12 19l8-8z" transform="rotate(-90 12 12)" />
                            </svg>
                          ) : (
                            /* Eye / views icon */
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                              <circle cx="12" cy="12" r="3" fill="currentColor" />
                            </svg>
                          )}
                        </div>
                        <p className={s.promoText}>
                          {isBoost
                            ? t('search.promoBoost')
                            : t('search.promoViews')}
                        </p>
                        <button className={s.promoBtn} type="button">
                          {isBoost
                            ? t('search.promoBoostBtn')
                            : t('search.promoViewsBtn')}
                        </button>
                      </div>
                    );
                  }

                  const girl = item.girl;
                  return (
                    <div
                      key={girl.id}
                      className={s.galleryCard}
                      onClick={() => openDrawer(girl)}
                    >
                      <img
                        src={girl.photo}
                        alt={girl.name}
                        className={s.galleryCardImage}
                        loading="lazy"
                      />
                      <div className={s.galleryCardInfo}>
                        <span className={s.galleryCardName}>{girl.name},</span>
                        <span className={s.galleryCardAge}>{girl.age}</span>
                        <svg className={s.galleryCardVerified} width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#3B82F6" />
                          <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {girl.online && <span className={s.galleryCardOnline} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>

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
          onChat={(g) => {
            closeDrawer();
            navigate(`/chat?girl=${g.id}`);
          }}
        />
      </div>
    </PageTransition>
  );
}
