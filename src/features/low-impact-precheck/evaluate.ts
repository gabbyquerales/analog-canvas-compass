import type { ShootInput, EvaluationResult, Rule, ResultState } from './types';
import { ACTIVITY_FLAGS, LOCATION_FLAGS, REVIEW_TRIGGERS, THRESHOLDS, DEADLINES, FEE_MATH } from './rules';
import { countBusinessDays } from './businessDays';

const KB_URL = 'https://info.filmla.com/general-information/low-impact-permit-pilot-program';

/** Hazard 2 fix: id-based lookup instead of positional indexing */
function findActivity(id: string): Rule {
  const rule = ACTIVITY_FLAGS.find((r) => r.id === id);
  if (!rule) throw new Error(`Unknown activity rule: ${id}`);
  return rule;
}

function findLocation(id: string): Rule {
  const rule = LOCATION_FLAGS.find((r) => r.id === id);
  if (!rule) throw new Error(`Unknown location rule: ${id}`);
  return rule;
}

function findReview(id: string): Rule {
  const rule = REVIEW_TRIGGERS.find((r) => r.id === id);
  if (!rule) throw new Error(`Unknown review trigger: ${id}`);
  return rule;
}

export function evaluate(input: ShootInput): EvaluationResult {
  // Hazard 7: jurisdiction gate
  if (input.jurisdiction && input.jurisdiction !== 'cityOfLA') {
    return {
      state: 'notApplicable',
      blockers: [],
      reviewTriggers: [],
      appliedSuggestions: [],
      feeMath: { applicationFee: 0, notificationPerLocation: 0, lafdSpotCheck: 0, estimatedTotal: 0, savingsPercent: 0, standardTierEstimate: 0 },
    };
  }

  const blockers: Rule[] = [];
  const reviewTriggers: Rule[] = [];

  // Hazard 2 fix: id-based lookup for all activity checks
  if (input.hasSpecialEffects) blockers.push(findActivity('act_special_effects'));
  if (input.hasGunfire) blockers.push(findActivity('act_gunfire'));
  if (input.hasOfficerImpersonation) blockers.push(findActivity('act_officer_impersonation'));
  if (input.hasLaneClosures) blockers.push(findActivity('act_lane_closure'));
  if (input.hasTrafficControl) blockers.push(findActivity('act_traffic_control'));
  if (input.hasDrivingShots) blockers.push(findActivity('act_driving_shots'));
  if (input.hasAerialActivity) blockers.push(findActivity('act_aerial_activity'));
  if (input.hasAnimalActivity) blockers.push(findActivity('act_animal_activity'));
  if (input.hasAmplifiedMusic) blockers.push(findActivity('act_amplified_music'));
  if (input.hasLargeLighting) {
    if (input.hasLargeLightingAssessment === 'yes') {
      blockers.push(findActivity('act_large_lighting'));
    } else if (input.hasLargeLightingAssessment === 'unsure') {
      reviewTriggers.push(findReview('review_large_lighting_self_assess'));
    }
  }
  if (input.hasGenerators) blockers.push(findActivity('act_generators'));
  if (input.hasOpenFlames) blockers.push(findActivity('act_open_flames'));
  if (input.hasPropaneHeaters) blockers.push(findActivity('act_propane_heaters'));
  if (input.hasSmokeMachines) blockers.push(findActivity('act_smoke_machines'));
  if (input.hasAlarmBypass) blockers.push(findActivity('act_alarm_bypass'));
  if (input.hasSmoking) blockers.push(findActivity('act_smoking'));
  if (input.hasPracticalStove) blockers.push(findActivity('act_practical_stove'));
  if (input.hasGrillingFoodPrep) blockers.push(findActivity('act_grilling_food_prep'));
  if (input.hasStunts) blockers.push(findActivity('act_stunts'));
  if (input.hasLandscapeAlteration) blockers.push(findActivity('act_landscape_alteration'));
  if (input.hasSignRemoval) blockers.push(findActivity('act_sign_removal'));
  if (input.hasDiggingDrilling) blockers.push(findActivity('act_digging_drilling'));
  if (input.hasNailingBolting) blockers.push(findActivity('act_nailing_bolting'));
  if (input.hasHeavyEquipmentOnGrass) blockers.push(findActivity('act_heavy_equipment_grass'));
  if (input.hasCranes) blockers.push(findActivity('act_cranes_jibs'));

  // Hazard 1 fix: location checks use IDs directly (form stores IDs via value field)
  const locTypes = input.locationTypes || [];

  // Hazard 5 (Rec & Parks exemption): when isRecParkProperty is true,
  // skip the city_buildings blocker — push only the review trigger.
  if (locTypes.includes('schools')) blockers.push(findLocation('loc_schools'));
  if (locTypes.includes('city_buildings') && !input.isRecParkProperty) {
    blockers.push(findLocation('loc_city_buildings'));
  }
  if (locTypes.includes('neighborhood_conditions')) blockers.push(findLocation('loc_neighborhood_conditions'));
  if (locTypes.includes('rooftops')) blockers.push(findLocation('loc_rooftops'));
  if (locTypes.includes('hotels')) blockers.push(findLocation('loc_hotels'));
  if (locTypes.includes('interior_business')) blockers.push(findLocation('loc_interior_business'));
  if (locTypes.includes('airports')) blockers.push(findLocation('loc_airports'));
  if (locTypes.includes('basements')) blockers.push(findLocation('loc_basements'));
  if (locTypes.includes('multistory_apartments')) blockers.push(findLocation('loc_multistory_apartments'));
  if (locTypes.includes('high_rises')) blockers.push(findLocation('loc_high_rises'));
  if (locTypes.includes('brush')) blockers.push(findLocation('loc_brush'));
  if (locTypes.includes('harbor')) blockers.push(findLocation('loc_harbor'));
  if (locTypes.includes('helipads')) blockers.push(findLocation('loc_helipads'));

  // Rec & Parks review trigger
  if (input.isRecParkProperty) {
    reviewTriggers.push(findReview('review_rec_parks_property'));
  }

  // Check thresholds
  if (input.locationCount > THRESHOLDS.maxLocations) {
    blockers.push({
      id: 'threshold_locations',
      label: `No more than ${THRESHOLDS.maxLocations} filming locations per project`,
      category: 'threshold',
      disqualifier: true,
      sourceUrl: KB_URL,
    });
  }

  if (input.consecutiveFilmingDays > THRESHOLDS.maxConsecutiveDays) {
    blockers.push({
      id: 'threshold_consecutive_days',
      label: `No more than ${THRESHOLDS.maxConsecutiveDays} consecutive filming days per project`,
      category: 'threshold',
      disqualifier: true,
      sourceUrl: KB_URL,
    });
  }

  if (input.isConsecutiveDays === false && input.consecutiveFilmingDays <= THRESHOLDS.maxConsecutiveDays) {
    reviewTriggers.push(findReview('review_non_consecutive_days'));
  }

  if (input.onSetCount > THRESHOLDS.maxOnSetCount) {
    blockers.push({
      id: 'threshold_on_set',
      label: `No more than ${THRESHOLDS.maxOnSetCount} total cast & crew physically on set`,
      category: 'threshold',
      disqualifier: true,
      sourceUrl: KB_URL,
    });
  }

  // Hazard 3 fix: trust the boolean self-report, don't use broken getHours() logic.
  // If the producer says they're filming outside standard hours, that's a blocker.
  if (input.filmingOutsideBusinessHours) {
    blockers.push({
      id: 'hours_outside_standard',
      label: 'Filming outside standard hours (7am–10pm weekdays, 9am–10pm weekends)',
      category: 'hours',
      disqualifier: true,
      sourceUrl: KB_URL,
    });
  }

  // Hazard 4 fix: real business day calculation using date-holidays US-CA
  const firstFilmDate = new Date(input.firstFilmingDate);
  const now = new Date(input.submissionDate);
  const businessDaysUntilShoot = countBusinessDays(now, firstFilmDate);

  if (businessDaysUntilShoot < DEADLINES.minBusinessDays) {
    blockers.push({
      id: 'deadline_insufficient_notice',
      label: `Minimum ${DEADLINES.minBusinessDays} full business days notice required before first filming day (submit by 10am; weekends and CA holidays don't count)`,
      category: 'deadline',
      disqualifier: true,
      sourceUrl: KB_URL,
    });
  }

  const daysUntilShoot = Math.floor((firstFilmDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const monthsUntilShoot = daysUntilShoot / 30;
  if (monthsUntilShoot > DEADLINES.maxMonthsAhead) {
    blockers.push({
      id: 'deadline_too_early',
      label: `Applications accepted no more than ${DEADLINES.maxMonthsAhead} month in advance`,
      category: 'deadline',
      disqualifier: true,
      sourceUrl: KB_URL,
    });
  }

  const sunsetDate = new Date(DEADLINES.sunsetISO);
  if (firstFilmDate > sunsetDate) {
    blockers.push({
      id: 'deadline_pilot_sunset',
      label: 'Filming must complete by October 31, 2026 (pilot program ends)',
      category: 'deadline',
      disqualifier: true,
      sourceUrl: KB_URL,
    });
  }

  // Determine state and fee math
  let state: ResultState = 'qualifies';
  if (blockers.length > 0) {
    state = 'doesNotQualify';
  } else if (reviewTriggers.length > 0) {
    state = 'needsReview';
  }

  const feeMath = calculateFees(input, state);

  return {
    state,
    blockers: blockers.slice(),
    reviewTriggers: reviewTriggers.slice(),
    appliedSuggestions: [],
    feeMath,
    primaryBlocker: blockers.length > 0 ? blockers[0] : undefined,
  };
}

function calculateFees(input: ShootInput, state: string) {
  if (state === 'qualifies' || state === 'needsReview') {
    const appFee = FEE_MATH.lowImpact.application;
    const notifPerLoc = FEE_MATH.lowImpact.notificationPerLocation * input.locationCount;
    const lafdSpotCheck = FEE_MATH.lowImpact.lafdSpotCheck;
    const lowImpactTotal = appFee + notifPerLoc + lafdSpotCheck;

    const standardTotal =
      FEE_MATH.standard.application +
      FEE_MATH.standard.notificationPerLocation * input.locationCount +
      FEE_MATH.standard.lafdSpotCheck;

    const savings = standardTotal - lowImpactTotal;
    const savingsPercent = Math.round((savings / standardTotal) * 100);

    return {
      applicationFee: appFee,
      notificationPerLocation: notifPerLoc,
      lafdSpotCheck: lafdSpotCheck,
      estimatedTotal: lowImpactTotal,
      savingsPercent: savingsPercent,
      standardTierEstimate: standardTotal,
    };
  }

  // doesNotQualify still shows fee comparison
  const standardTotal =
    FEE_MATH.standard.application +
    FEE_MATH.standard.notificationPerLocation * input.locationCount +
    FEE_MATH.standard.lafdSpotCheck;

  return {
    applicationFee: FEE_MATH.standard.application,
    notificationPerLocation: FEE_MATH.standard.notificationPerLocation * input.locationCount,
    lafdSpotCheck: FEE_MATH.standard.lafdSpotCheck,
    estimatedTotal: standardTotal,
    savingsPercent: 0,
    standardTierEstimate: standardTotal,
  };
}
