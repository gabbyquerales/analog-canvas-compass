import type { ShootInput, EvaluationResult } from './types';
import { ACTIVITY_FLAGS, LOCATION_FLAGS, REVIEW_TRIGGERS, THRESHOLDS, DEADLINES, HOURS, FEE_MATH } from './rules';

export function evaluate(input: ShootInput): EvaluationResult {
  const blockers: typeof ACTIVITY_FLAGS = [];
  const reviewTriggers: typeof REVIEW_TRIGGERS = [];

  // Check activity flags
  if (input.hasSpecialEffects) blockers.push(ACTIVITY_FLAGS[0]);
  if (input.hasGunfire) blockers.push(ACTIVITY_FLAGS[1]);
  if (input.hasOfficerImpersonation) blockers.push(ACTIVITY_FLAGS[2]);
  if (input.hasLaneClosures) blockers.push(ACTIVITY_FLAGS[3]);
  if (input.hasTrafficControl) blockers.push(ACTIVITY_FLAGS[4]);
  if (input.hasDrivingShots) blockers.push(ACTIVITY_FLAGS[5]);
  if (input.hasAerialActivity) blockers.push(ACTIVITY_FLAGS[6]);
  if (input.hasAnimalActivity) blockers.push(ACTIVITY_FLAGS[7]);
  if (input.hasAmplifiedMusic) blockers.push(ACTIVITY_FLAGS[8]);
  if (input.hasLargeLighting) {
    if (input.hasLargeLightingAssessment === 'yes') {
      blockers.push(ACTIVITY_FLAGS[9]);
    } else if (input.hasLargeLightingAssessment === 'unsure') {
      reviewTriggers.push(REVIEW_TRIGGERS[1]);
    }
  }
  if (input.hasGenerators) blockers.push(ACTIVITY_FLAGS[10]);
  if (input.hasOpenFlames) blockers.push(ACTIVITY_FLAGS[11]);
  if (input.hasPropaneHeaters) blockers.push(ACTIVITY_FLAGS[12]);
  if (input.hasSmokeMachines) blockers.push(ACTIVITY_FLAGS[13]);
  if (input.hasAlarmBypass) blockers.push(ACTIVITY_FLAGS[14]);
  if (input.hasSmoking) blockers.push(ACTIVITY_FLAGS[15]);
  if (input.hasPracticalStove) blockers.push(ACTIVITY_FLAGS[16]);
  if (input.hasGrillingFoodPrep) blockers.push(ACTIVITY_FLAGS[17]);
  if (input.hasStunts) blockers.push(ACTIVITY_FLAGS[18]);
  if (input.hasLandscapeAlteration) blockers.push(ACTIVITY_FLAGS[19]);
  if (input.hasSignRemoval) blockers.push(ACTIVITY_FLAGS[20]);
  if (input.hasDiggingDrilling) blockers.push(ACTIVITY_FLAGS[21]);
  if (input.hasNailingBolting) blockers.push(ACTIVITY_FLAGS[22]);
  if (input.hasHeavyEquipmentOnGrass) blockers.push(ACTIVITY_FLAGS[23]);
  if (input.hasCranes) blockers.push(ACTIVITY_FLAGS[24]);

  // Check location flags
  const locTypes = input.locationTypes || [];
  if (locTypes.includes('schools')) blockers.push(LOCATION_FLAGS[0]);
  if (locTypes.includes('city_buildings')) blockers.push(LOCATION_FLAGS[1]);
  if (locTypes.includes('neighborhood_conditions')) blockers.push(LOCATION_FLAGS[2]);
  if (locTypes.includes('rooftops')) blockers.push(LOCATION_FLAGS[3]);
  if (locTypes.includes('hotels')) blockers.push(LOCATION_FLAGS[4]);
  if (locTypes.includes('interior_business')) blockers.push(LOCATION_FLAGS[5]);
  if (locTypes.includes('airports')) blockers.push(LOCATION_FLAGS[6]);
  if (locTypes.includes('basements')) blockers.push(LOCATION_FLAGS[7]);
  if (locTypes.includes('multistory_apartments')) blockers.push(LOCATION_FLAGS[8]);
  if (locTypes.includes('high_rises')) blockers.push(LOCATION_FLAGS[9]);
  if (locTypes.includes('brush')) blockers.push(LOCATION_FLAGS[10]);
  if (locTypes.includes('harbor')) blockers.push(LOCATION_FLAGS[11]);
  if (locTypes.includes('helipads')) blockers.push(LOCATION_FLAGS[12]);

  // Rec & Parks special case
  if (input.isRecParkProperty) {
    reviewTriggers.push(REVIEW_TRIGGERS[2]);
  }

  // Check thresholds
  if (input.locationCount > THRESHOLDS.maxLocations) {
    blockers.push({
      id: 'threshold_locations',
      label: `No more than ${THRESHOLDS.maxLocations} filming locations per project`,
      category: 'threshold',
      disqualifier: true,
      sourceUrl: 'https://info.filmla.com/general-information/low-impact-permit-pilot-program',
    });
  }

  if (input.consecutiveFilmingDays > THRESHOLDS.maxConsecutiveDays) {
    blockers.push({
      id: 'threshold_consecutive_days',
      label: `No more than ${THRESHOLDS.maxConsecutiveDays} consecutive filming days per project`,
      category: 'threshold',
      disqualifier: true,
      sourceUrl: 'https://info.filmla.com/general-information/low-impact-permit-pilot-program',
    });
  }

  if (input.isConsecutiveDays === false && input.consecutiveFilmingDays <= THRESHOLDS.maxConsecutiveDays) {
    reviewTriggers.push(REVIEW_TRIGGERS[0]);
  }

  if (input.onSetCount > THRESHOLDS.maxOnSetCount) {
    blockers.push({
      id: 'threshold_on_set',
      label: `No more than ${THRESHOLDS.maxOnSetCount} total cast & crew physically on set`,
      category: 'threshold',
      disqualifier: true,
      sourceUrl: 'https://info.filmla.com/general-information/low-impact-permit-pilot-program',
    });
  }

  // Check hours
  const submitDate = new Date(input.submissionDate);
  const dayOfWeek = submitDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const submitHour = submitDate.getHours();

  const hoursLimit = isWeekend ? HOURS.weekend : HOURS.weekday;
  if (input.fillingOutsideBusinessHours && (submitHour < hoursLimit.start || submitHour >= hoursLimit.end)) {
    blockers.push({
      id: 'hours_outside_standard',
      label: `Filming outside standard hours (${hoursLimit.start}am–10pm weekdays, 9am–10pm weekends)`,
      category: 'hours',
      disqualifier: true,
      sourceUrl: 'https://info.filmla.com/general-information/low-impact-permit-pilot-program',
    });
  }

  // Check deadlines
  const firstFilmDate = new Date(input.firstFilmingDate);
  const now = new Date();
  const daysUntilShoot = Math.floor((firstFilmDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const businessDaysUntilShoot = Math.ceil(daysUntilShoot / 1);

  if (businessDaysUntilShoot < DEADLINES.minBusinessDays) {
    blockers.push({
      id: 'deadline_insufficient_notice',
      label: `Minimum ${DEADLINES.minBusinessDays} full business days notice required before first filming day`,
      category: 'deadline',
      disqualifier: true,
      sourceUrl: 'https://info.filmla.com/general-information/low-impact-permit-pilot-program',
    });
  }

  const monthsUntilShoot = daysUntilShoot / 30;
  if (monthsUntilShoot > DEADLINES.maxMonthsAhead) {
    blockers.push({
      id: 'deadline_too_early',
      label: `Applications accepted no more than ${DEADLINES.maxMonthsAhead} month in advance`,
      category: 'deadline',
      disqualifier: true,
      sourceUrl: 'https://info.filmla.com/general-information/low-impact-permit-pilot-program',
    });
  }

  const sunsetDate = new Date(DEADLINES.sunsetISO);
  if (firstFilmDate > sunsetDate) {
    blockers.push({
      id: 'deadline_pilot_sunset',
      label: 'Filming must complete by October 31, 2026 (pilot program ends)',
      category: 'deadline',
      disqualifier: true,
      sourceUrl: 'https://info.filmla.com/general-information/low-impact-permit-pilot-program',
    });
  }

  // Determine state and fee math
  let state: 'qualifies' | 'needsReview' | 'doesNotQualify' = 'qualifies';
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
