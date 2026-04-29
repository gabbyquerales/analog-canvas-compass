import type { ShootInput } from './types';

/**
 * Seed test scenarios for Low Impact Pre-Check evaluation.
 * Each scenario has an expected output comment above it.
 */

/**
 * Expected: qualifies
 * Reasoning: 2 locations, 2 consecutive days, 18 crew, no activity flags, no location flags
 */
export const heroSilverLake: ShootInput = {
  projectName: 'Silver Lake Dialogue',
  jurisdiction: 'cityOfLA',
  firstFilmingDate: '2026-05-10',
  submissionDate: '2026-05-06',
  locationCount: 2,
  consecutiveFilmingDays: 2,
  isConsecutiveDays: true,
  onSetCount: 18,
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
  hasLandscapeAlteration: false,
  hasSignRemoval: false,
  hasDiggingDrilling: false,
  hasNailingBolting: false,
  hasHeavyEquipmentOnGrass: false,
  hasCranes: false,
  locationTypes: [],
  filmingOutsideBusinessHours: false,
};

/**
 * Expected: doesNotQualify (with location-consolidation suggestion, tier 5)
 * Reasoning: 4 locations exceeds max of 3
 */
export const tooManyLocations: ShootInput = {
  projectName: 'Downtown Montage',
  jurisdiction: 'cityOfLA',
  firstFilmingDate: '2026-05-15',
  submissionDate: '2026-05-12',
  locationCount: 4,
  consecutiveFilmingDays: 2,
  isConsecutiveDays: true,
  onSetCount: 22,
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
  hasLandscapeAlteration: false,
  hasSignRemoval: false,
  hasDiggingDrilling: false,
  hasNailingBolting: false,
  hasHeavyEquipmentOnGrass: false,
  hasCranes: false,
  locationTypes: [],
  filmingOutsideBusinessHours: false,
};

/**
 * Expected: doesNotQualify (with split-the-shoot suggestion, tier 1)
 * Reasoning: aerial activity (drone) disqualifies; can be isolated to separate Standard day.
 * locationTypes intentionally [] — tests single-activity-blocker → tier-1 split suggestion.
 */
export const droneDisqualifier: ShootInput = {
  projectName: 'Aerial Sequence',
  jurisdiction: 'cityOfLA',
  firstFilmingDate: '2026-05-20',
  submissionDate: '2026-05-16',
  locationCount: 1,
  consecutiveFilmingDays: 3,
  isConsecutiveDays: true,
  onSetCount: 25,
  hasSpecialEffects: false,
  hasGunfire: false,
  hasOfficerImpersonation: false,
  hasLaneClosures: false,
  hasTrafficControl: false,
  hasDrivingShots: false,
  hasAerialActivity: true,
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
  hasLandscapeAlteration: false,
  hasSignRemoval: false,
  hasDiggingDrilling: false,
  hasNailingBolting: false,
  hasHeavyEquipmentOnGrass: false,
  hasCranes: false,
  locationTypes: [],
  filmingOutsideBusinessHours: false,
};

/**
 * Expected: needsReview (with rec-parks-verify suggestion, tier 2)
 * Reasoning: city_buildings location type + isRecParkProperty suppresses the
 * city_buildings blocker and pushes review_rec_parks_property trigger instead.
 */
export const recParksAmbiguity: ShootInput = {
  projectName: 'Griffith Park Narrative',
  jurisdiction: 'cityOfLA',
  firstFilmingDate: '2026-05-25',
  submissionDate: '2026-05-21',
  locationCount: 1,
  consecutiveFilmingDays: 1,
  isConsecutiveDays: true,
  onSetCount: 12,
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
  hasLandscapeAlteration: false,
  hasSignRemoval: false,
  hasDiggingDrilling: false,
  hasNailingBolting: false,
  hasHeavyEquipmentOnGrass: false,
  hasCranes: false,
  locationTypes: ['city_buildings'],
  isRecParkProperty: true,
  filmingOutsideBusinessHours: false,
};
