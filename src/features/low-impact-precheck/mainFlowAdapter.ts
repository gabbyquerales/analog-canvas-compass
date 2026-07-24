// Main-flow adapter: bridges the fee calculator's ShootInputs to the Low Impact
// rules engine (docs/OVERVIEW.md § Direction decided 2026-07-23).
//
// Principle: main-flow inputs alone can prove a definitive "no" (a hard blocker
// like >3 locations or a drone day), but NEVER an unconditional "yes" — a "yes"
// always requires the confirm step, which collects the inputs the main flow
// doesn't capture (dates, prohibited location types, finer activity flags).

import type { ShootInputs } from '@/lib/feeCalculator';
import type { ShootInput, EvaluationResult, Rule } from './types';
import { evaluate } from './evaluate';

/**
 * Main-flow special activities → rules-engine flags.
 * Keys are activities.json ids (identical to slugs).
 * null = deliberately unmapped:
 *  - night_shoot: ambiguous — a "night shoot" may still end by 10pm, so it can't
 *    prove a definitive no; the confirm step asks the hours question directly.
 *  - water_effects: not on FilmLA's Low Impact prohibited list.
 */
export const MAIN_FLOW_ACTIVITY_TO_FLAG: Record<string, keyof ShootInput | null> = {
  street_closure: 'hasLaneClosures',
  gunfire_sfx: 'hasGunfire',
  pyrotechnics: 'hasSpecialEffects',
  drone_aerial: 'hasAerialActivity',
  night_shoot: null,
  water_effects: null,
  animals: 'hasAnimalActivity',
  stunts: 'hasStunts',
};

/** Answers collected by the confirm step (inputs the main flow doesn't capture). */
export interface LowImpactConfirmInputs {
  firstFilmingDate: string; // ISO date
  locationTypes: string[]; // ids matching formSchema locationTypes options
  isRecParkProperty: boolean;
  recParksActivities: string[]; // rule ids from REC_PARKS_SCOPED_ACTIVITY_IDS
  filmingOutsideBusinessHours: boolean;
  additionalActivities: string[]; // rule ids from ADDITIONAL_ACTIVITY_OPTIONS
}

/**
 * Finer activity flags the main flow doesn't capture, asked as one multiselect
 * in the confirm step. Values are rules.ts ids; each maps to a ShootInput flag.
 * (The six Rec & Parks-scoped rules are asked separately via recParksActivities.)
 */
export const ADDITIONAL_ACTIVITY_OPTIONS: Array<{ value: string; label: string; flag: keyof ShootInput }> = [
  { value: 'act_special_effects', label: 'Special effects requiring LAFD permit', flag: 'hasSpecialEffects' },
  { value: 'act_officer_impersonation', label: 'Impersonating officers or emergency personnel', flag: 'hasOfficerImpersonation' },
  { value: 'act_traffic_control', label: 'Traffic control or interference with public right of way', flag: 'hasTrafficControl' },
  { value: 'act_driving_shots', label: 'Driving shots', flag: 'hasDrivingShots' },
  { value: 'act_amplified_music', label: 'Amplified music performance or playback', flag: 'hasAmplifiedMusic' },
  { value: 'act_large_lighting', label: 'Large lighting setups (crane, multiple HMIs >12kW, or generator truck)', flag: 'hasLargeLighting' },
  { value: 'act_generators', label: 'Generators (incl. battery packs over 25kW)', flag: 'hasGenerators' },
  { value: 'act_open_flames', label: 'Open flames', flag: 'hasOpenFlames' },
  { value: 'act_propane_heaters', label: 'Propane heaters', flag: 'hasPropaneHeaters' },
  { value: 'act_smoke_machines', label: 'Smoke machines', flag: 'hasSmokeMachines' },
  { value: 'act_alarm_bypass', label: 'Building alarms in test mode or bypassed', flag: 'hasAlarmBypass' },
  { value: 'act_smoking', label: 'Smoking on set', flag: 'hasSmoking' },
  { value: 'act_practical_stove', label: 'Practical stove, fireplace, or grill (LAFD 315 permit)', flag: 'hasPracticalStove' },
  { value: 'act_grilling_food_prep', label: 'Grilling or food prep requiring heat sources', flag: 'hasGrillingFoodPrep' },
];

const EMPTY_FLAGS: Omit<ShootInput, 'projectName' | 'jurisdiction' | 'firstFilmingDate' | 'submissionDate' | 'locationCount' | 'consecutiveFilmingDays' | 'onSetCount' | 'locationTypes'> = {
  hasSpecialEffects: false,
  hasGunfire: false,
  hasOfficerImpersonation: false,
  hasLaneClosures: false,
  hasTrafficControl: false,
  hasDrivingShots: false,
  hasAerialActivity: false,
  hasAnimalActivity: false,
  hasAmplifiedMusic: false,
  hasLargeLighting: false,
  hasGenerators: false,
  hasOpenFlames: false,
  hasPropaneHeaters: false,
  hasSmokeMachines: false,
  hasAlarmBypass: false,
  hasSmoking: false,
  hasPracticalStove: false,
  hasGrillingFoodPrep: false,
  hasStunts: false,
};

function applyActivityIds(input: ShootInput, ids: string[], lookup: (id: string) => keyof ShootInput | null | undefined): void {
  for (const id of ids) {
    const flag = lookup(id);
    if (flag) (input as any)[flag] = true;
  }
  // Large lighting uses the two-field pattern; selecting it in a checklist means
  // the user affirmed the self-assessment criteria in the option label.
  if (input.hasLargeLighting) input.hasLargeLightingAssessment = 'yes';
}

/**
 * Build the partial rules-engine input derivable from main-flow inputs alone.
 * ASSUMPTION (documented in OVERVIEW): the main flow's "Days" stepper is treated
 * as consecutive filming days — it has no gap concept.
 */
export function buildPartialRulesInput(main: ShootInputs, todayISO: string): ShootInput {
  const input: ShootInput = {
    projectName: '',
    jurisdiction: main.jurisdictionSlug === 'los-angeles' ? 'cityOfLA' : 'other',
    // Synthetic dates that satisfy the deadline rules; detection filters
    // deadline-category blockers out anyway. Real dates come from the confirm step.
    firstFilmingDate: addDaysISO(todayISO, 10),
    submissionDate: todayISO,
    locationCount: main.numberOfLocations,
    consecutiveFilmingDays: main.shootDays,
    onSetCount: main.crewSize,
    locationTypes: main.isParksLocation ? ['park'] : [],
    isRecParkProperty: main.isParksLocation || undefined,
    ...EMPTY_FLAGS,
  };
  applyActivityIds(input, main.selectedActivities, (id) => MAIN_FLOW_ACTIVITY_TO_FLAG[id]);
  return input;
}

export interface LowImpactPotential {
  /** True when nothing in the main-flow inputs definitively disqualifies the shoot. */
  potential: boolean;
  /** The non-deadline blockers that ruled it out (empty when potential). */
  definitiveBlockers: Rule[];
}

/**
 * Definitive-no detection from main-flow inputs alone.
 * Deadline-category blockers are ignored here — the main flow has no dates, so
 * date rules only run after the confirm step supplies a real filming date.
 * Only standard motion productions see the banner: student, non-profit, and
 * still-photo shoots already pay less than the $350 Low Impact application fee.
 */
export function detectLowImpactPotential(main: ShootInputs, todayISO: string): LowImpactPotential {
  if (main.jurisdictionSlug !== 'los-angeles' || !main.isMotion || main.isStudent || main.isNonProfit) {
    return { potential: false, definitiveBlockers: [] };
  }
  const result = evaluate(buildPartialRulesInput(main, todayISO));
  const definitiveBlockers = result.blockers.filter((b) => b.category !== 'deadline');
  return { potential: definitiveBlockers.length === 0, definitiveBlockers };
}

/**
 * Build the full rules-engine input from main-flow inputs + confirm answers,
 * then evaluate. This is the only path that can produce qualifies/needsReview.
 */
export function evaluateWithConfirm(
  main: ShootInputs,
  confirm: LowImpactConfirmInputs,
  todayISO: string,
): EvaluationResult {
  const input = buildPartialRulesInput(main, todayISO);
  input.firstFilmingDate = confirm.firstFilmingDate;
  input.submissionDate = todayISO;
  // Merge location types: keep the main flow's park signal, add confirm answers.
  input.locationTypes = Array.from(new Set([...input.locationTypes, ...confirm.locationTypes]));
  input.isRecParkProperty = main.isParksLocation || confirm.isRecParkProperty;
  input.recParksActivities = input.isRecParkProperty ? confirm.recParksActivities : [];
  input.filmingOutsideBusinessHours = confirm.filmingOutsideBusinessHours;
  applyActivityIds(input, confirm.additionalActivities, (id) =>
    ADDITIONAL_ACTIVITY_OPTIONS.find((o) => o.value === id)?.flag,
  );
  return evaluate(input);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
