/* ═══════════════════════════════════════════
   LUMINA — Girl profile centered modal
   Centered modal with blur backdrop,
   scrollable content, close button.
   Works on PC & mobile without stretching.
   ═══════════════════════════════════════════ */

import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Girl } from '../../data/girls';
import styles from './GirlProfileDrawer.module.css';

/* ── Localised labels passed from parent ── */
export interface GirlProfileLabels {
  datingGoal: string;
  lookingForMale: string;
  lookingForFemale: string;
  lookingForAny: string;
  age: string;
  aboutMe: string;
  education: string;
  languages: string;
  lifestyle: string;
  appearance: string;
  height: string;
  weight: string;
  compatibility: string;
  checkCommon: string;
  morePhotos: string;
  km: string;
  cm: string;
  kg: string;
  /* Goals */
  goalSerious: string;
  goalFriendship: string;
  goalFlirt: string;
  goalUndecided: string;
  /* Education */
  eduSchool: string;
  eduCollege: string;
  eduBachelor: string;
  eduMaster: string;
  eduPhd: string;
  eduNone: string;
  /* Lifestyle */
  work: string;
  children: string;
  alcohol: string;
  smoking: string;
  childrenNone: string;
  childrenHas: string;
  childrenWant: string;
  childrenDontWant: string;
  alcoholNo: string;
  alcoholSometimes: string;
  alcoholYes: string;
  smokingNo: string;
  smokingSometimes: string;
  smokingYes: string;
  /* Zodiac */
  zodiacAries: string;
  zodiacTaurus: string;
  zodiacGemini: string;
  zodiacCancer: string;
  zodiacLeo: string;
  zodiacVirgo: string;
  zodiacLibra: string;
  zodiacScorpio: string;
  zodiacSagittarius: string;
  zodiacCapricorn: string;
  zodiacAquarius: string;
  zodiacPisces: string;
  /* Body type */
  bodySlim: string;
  bodyAthletic: string;
  bodyAverage: string;
  bodyCurvy: string;
  bodyPlus: string;
}

interface Props {
  open: boolean;
  girl: Girl | null;
  onClose: () => void;
  t: GirlProfileLabels;
  onChat?: (girl: Girl) => void;
  onLike?: (girl: Girl) => void;
  onSuperLike?: (girl: Girl) => void;
  /** Hide the sticky action bar (chat / like / super-like). Useful when opened from within Chat page. */
  hideActionBar?: boolean;
}

/* ── Helpers ── */

const goalIcon: Record<string, string> = {
  serious: '\u2764\uFE0F',
  friendship: '\uD83D\uDCAC',
  flirt: '\uD83D\uDD25',
  undecided: '\uD83E\uDD37',
};

function goalLabel(goal: string, t: GirlProfileLabels): string {
  const map: Record<string, string> = {
    serious: t.goalSerious,
    friendship: t.goalFriendship,
    flirt: t.goalFlirt,
    undecided: t.goalUndecided,
  };
  return map[goal] ?? goal;
}

function eduLabel(edu: string, t: GirlProfileLabels): string {
  const map: Record<string, string> = {
    school: t.eduSchool,
    college: t.eduCollege,
    bachelor: t.eduBachelor,
    master: t.eduMaster,
    phd: t.eduPhd,
    none: t.eduNone,
  };
  return map[edu] ?? edu;
}

function childrenLabel(v: string, t: GirlProfileLabels): string {
  const map: Record<string, string> = {
    none: t.childrenNone,
    has: t.childrenHas,
    want: t.childrenWant,
    dontWant: t.childrenDontWant,
  };
  return map[v] ?? v;
}

function alcoholLabel(v: string, t: GirlProfileLabels): string {
  const map: Record<string, string> = {
    no: t.alcoholNo,
    sometimes: t.alcoholSometimes,
    yes: t.alcoholYes,
  };
  return map[v] ?? v;
}

function smokingLabel(v: string, t: GirlProfileLabels): string {
  const map: Record<string, string> = {
    no: t.smokingNo,
    sometimes: t.smokingSometimes,
    yes: t.smokingYes,
  };
  return map[v] ?? v;
}

function zodiacLabel(z: string | undefined, t: GirlProfileLabels): string {
  if (!z) return '';
  const map: Record<string, string> = {
    aries: t.zodiacAries,
    taurus: t.zodiacTaurus,
    gemini: t.zodiacGemini,
    cancer: t.zodiacCancer,
    leo: t.zodiacLeo,
    virgo: t.zodiacVirgo,
    libra: t.zodiacLibra,
    scorpio: t.zodiacScorpio,
    sagittarius: t.zodiacSagittarius,
    capricorn: t.zodiacCapricorn,
    aquarius: t.zodiacAquarius,
    pisces: t.zodiacPisces,
  };
  return map[z] ?? z;
}

function bodyLabel(b: string | undefined, t: GirlProfileLabels): string {
  if (!b) return '';
  const map: Record<string, string> = {
    slim: t.bodySlim,
    athletic: t.bodyAthletic,
    average: t.bodyAverage,
    curvy: t.bodyCurvy,
    plus: t.bodyPlus,
  };
  return map[b] ?? b;
}

function lookingForGender(gender: string, t: GirlProfileLabels): string {
  const map: Record<string, string> = {
    male: t.lookingForMale,
    female: t.lookingForFemale,
    any: t.lookingForAny,
  };
  return map[gender] ?? gender;
}

/* ── Animation variants ── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 28, stiffness: 320 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 30,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

/* ── Main component ── */

export default function GirlProfileDrawer({ open, girl, onClose, t, onChat, onLike, onSuperLike, hideActionBar }: Props) {
  const navigate = useNavigate();

  if (!girl) return null;

  const extraPhotos = girl.photos.length > 3 ? girl.photos.length - 3 : 0;

  return (
    <AnimatePresence>
      {open && (
        /* Blur overlay — flex centers the modal */
        <motion.div
          className={styles.overlay}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          {/* Centered modal — stopPropagation so clicking inside doesn't close */}
          <motion.div
            className={styles.modal}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className={styles.closeBtn}
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className={styles.content}>
              {/* ── Main photo ── */}
              <div className={styles.heroPhoto}>
                <img src={girl.photo} alt={girl.name} loading="eager" />
                <div className={styles.heroOverlay}>
                  <div className={styles.heroInfo}>
                    <span className={styles.heroName}>
                      {girl.name}, {girl.age}
                      {girl.verified && (
                        <svg className={styles.verifiedBadge} width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#3B82F6" />
                          <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {girl.online && <span className={styles.onlineDot} />}
                  </div>
                </div>
              </div>

              {/* ── Dating goal ── */}
              <section className={styles.infoBlock}>
                <div className={styles.infoHeader}>
                  {girl.verified && (
                    <svg className={styles.verifiedSmall} width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#3B82F6" />
                      <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span className={styles.infoLabel}>{t.datingGoal}</span>
                </div>
                <p className={styles.infoValue}>
                  {lookingForGender(girl.lookingFor.gender, t)}, {girl.lookingFor.ageMin}–{girl.lookingFor.ageMax} {t.age}
                </p>
                <div className={styles.goalsList}>
                  {girl.goals.map(g => (
                    <div key={g} className={styles.goalItem}>
                      <span className={styles.goalIcon}>{goalIcon[g]}</span>
                      <span>{goalLabel(g, t)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Distance ── */}
              <section className={styles.distanceBlock}>
                <div className={styles.distanceAvatar}>
                  <img src={girl.photo} alt="" />
                </div>
                <div>
                  <span className={styles.distanceValue}>{girl.distance} {t.km}</span>
                  <span className={styles.distanceCity}>{girl.city}</span>
                </div>
              </section>

              {/* ── About me (quote card) ── */}
              {girl.about && (
                <section className={styles.quoteCard}>
                  <div className={styles.quoteHeader}>
                    <span className={styles.quoteLabel}>{t.aboutMe}</span>
                    <svg className={styles.quoteIcon} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                      <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
                    </svg>
                  </div>
                  <p className={styles.quoteText}>{girl.about}</p>
                </section>
              )}

              {/* ── Education ── */}
              <section className={styles.infoBlock}>
                <span className={styles.infoLabel}>{t.education}</span>
                <p className={styles.infoValueBold}>{eduLabel(girl.education, t)}</p>
              </section>

              {/* ── Photo 2 ── */}
              {girl.photos[1] && (
                <div className={styles.photoBlock}>
                  <img src={girl.photos[1]} alt={`${girl.name} 2`} loading="lazy" />
                </div>
              )}

              {/* ── Languages ── */}
              {girl.languages.length > 0 && (
                <section className={styles.infoBlock}>
                  <span className={styles.infoLabel}>{t.languages}</span>
                  <p className={styles.infoValueBold}>{girl.languages.join(', ')}</p>
                </section>
              )}

              {/* ── Photo 3 ── */}
              {girl.photos[2] && (
                <div className={styles.photoBlock}>
                  <img src={girl.photos[2]} alt={`${girl.name} 3`} loading="lazy" />
                </div>
              )}

              {/* ── Lifestyle ── */}
              <section className={styles.infoBlock}>
                <span className={styles.infoLabel}>{t.lifestyle}</span>
                <div className={styles.lifestyleList}>
                  <div className={styles.lifestyleItem}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
                    <span>{girl.lifestyle.work}</span>
                  </div>
                  <div className={styles.lifestyleItem}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                    <span>{childrenLabel(girl.lifestyle.children, t)}</span>
                  </div>
                  <div className={styles.lifestyleItem}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 22V2l8 4-8 4" /><path d="M18 14c0 4-6 8-6 8s-6-4-6-8" /></svg>
                    <span>{alcoholLabel(girl.lifestyle.alcohol, t)}</span>
                  </div>
                  <div className={styles.lifestyleItem}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c-4 6-8 8-8 12a8 8 0 0016 0c0-4-4-6-8-12z" /></svg>
                    <span>{smokingLabel(girl.lifestyle.smoking, t)}</span>
                  </div>
                </div>
              </section>

              {/* ── Appearance ── */}
              <section className={styles.infoBlock}>
                <span className={styles.infoLabel}>{t.appearance}</span>
                <div className={styles.lifestyleList}>
                  <div className={styles.lifestyleItem}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /><path d="M8 6l4-4 4 4M8 18l4 4 4-4" /></svg>
                    <span>{girl.appearance.height} {t.cm}</span>
                  </div>
                  {girl.appearance.weight && (
                    <div className={styles.lifestyleItem}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      <span>{girl.appearance.weight} {t.kg}</span>
                    </div>
                  )}
                  {girl.appearance.bodyType && (
                    <div className={styles.lifestyleItem}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <span>{bodyLabel(girl.appearance.bodyType, t)}</span>
                    </div>
                  )}
                  {girl.appearance.zodiac && (
                    <div className={styles.lifestyleItem}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" /></svg>
                      <span>{zodiacLabel(girl.appearance.zodiac, t)}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Interests ── */}
              {girl.interests.length > 0 && (
                <section className={styles.infoBlock}>
                  <div className={styles.interestTags}>
                    {girl.interests.map((interest, i) => (
                      <span key={i} className={styles.interestTag}>{interest}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Extra photos circle ── */}
              {extraPhotos > 0 && girl.photos[3] && (
                <div className={styles.extraPhotosBlock}>
                  <div className={styles.extraPhotosCircle}>
                    <img src={girl.photos[3]} alt="" />
                    <div className={styles.extraPhotosOverlay}>
                      <span>{t.morePhotos.replace('{count}', String(extraPhotos))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Compatibility ── */}
              <div className={styles.compatBlock}>
                <span className={styles.compatPercent}>{girl.compatibility}%</span>
                <button
                  className={styles.compatBtn}
                  onClick={() => { onClose(); navigate('/shop'); }}
                  type="button"
                >
                  {t.checkCommon}
                </button>
              </div>

              {/* Bottom spacer for sticky bar */}
              <div className={styles.bottomSpacer} />
            </div>

            {/* ── Sticky action bar ── */}
            {!hideActionBar && (
              <div className={styles.actionBar}>
                <button className={styles.actionBtn} type="button" aria-label="Chat" onClick={() => { if (onChat && girl) onChat(girl); else onClose(); }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </button>
                <button className={`${styles.actionBtn} ${styles.actionLike}`} type="button" aria-label="Like" onClick={() => { if (onLike && girl) onLike(girl); }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </button>
                <button className={`${styles.actionBtn} ${styles.actionFire}`} type="button" aria-label="Super Like" onClick={() => { if (onSuperLike && girl) onSuperLike(girl); else onClose(); }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="url(#fireGrad)">
                    <defs>
                      <linearGradient id="fireGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F97316" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2c.5 4-2 6-2 10 0 2.5 2 4 4 4s4-1.5 4-4c0-6-6-10-6-10zm-2 16c-1.5 0-3-1-3-3 0-2 1.5-3 3-4 1.5 1 3 2 3 4s-1.5 3-3 3z" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
