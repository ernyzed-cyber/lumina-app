/* ═══════════════════════════════════════════
   LUMINA — Filter types for search / feed
   ═══════════════════════════════════════════ */

import type {
  DatingGoal,
  Education,
  Children,
  Smoking,
  Alcohol,
  BodyType,
  Zodiac,
  Wealth,
  Living,
} from '../data/girls';

/** Inclusive numeric range [min, max] */
export interface NumericRange {
  min: number;
  max: number;
}

/** Complete filter state used by FilterPanel */
export interface FilterState {
  age: NumericRange;
  height: NumericRange;
  weight: NumericRange;
  distance: number;              // max distance in km
  goals: DatingGoal[];
  education: Education[];
  children: Children[];
  smoking: Smoking[];
  alcohol: Alcohol[];
  bodyType: BodyType[];
  zodiac: Zodiac[];
  wealth: Wealth[];
  living: Living[];
  verifiedOnly: boolean;
  onlineOnly: boolean;
}

/** Default / initial filter values (no filters applied) */
export const DEFAULT_FILTERS: FilterState = {
  age: { min: 18, max: 45 },
  height: { min: 140, max: 200 },
  weight: { min: 40, max: 120 },
  distance: 200,
  goals: [],
  education: [],
  children: [],
  smoking: [],
  alcohol: [],
  bodyType: [],
  zodiac: [],
  wealth: [],
  living: [],
  verifiedOnly: false,
  onlineOnly: false,
};

/** Range limits used by sliders */
export const FILTER_LIMITS = {
  age: { min: 18, max: 60, step: 1 },
  height: { min: 140, max: 210, step: 1 },
  weight: { min: 35, max: 150, step: 1 },
  distance: { min: 1, max: 500, step: 5 },
} as const;
