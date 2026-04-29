export type RuleCategory = 'activity' | 'location' | 'threshold' | 'deadline' | 'hours' | 'review';
export type ResultState = 'qualifies' | 'needsReview' | 'doesNotQualify';

export interface Rule {
  id: string;
  label: string;
  category: RuleCategory;
  disqualifier: boolean;
  sourceUrl: string;
  formField?: string;
  helpText?: string;
}

export interface ShootInput {
  projectName: string;
  firstFilmingDate: string;
  locationCount: number;
  consecutiveFilmingDays: number;
  onSetCount: number;
  activitiesSelected: string[];
  locationsSelected: string[];
  hasSpecialEffects: boolean;
  hasGunfire: boolean;
  hasOfficerImpersonation: boolean;
  hasLaneClosures: boolean;
  hasTrafficControl: boolean;
  hasDrivingShots: boolean;
  hasAerialActivity: boolean;
  hasAnimalActivity: boolean;
  hasAmplifiedMusic: boolean;
  hasLargeLighting: boolean;
  hasLargeLightingAssessment?: string;
  hasGenerators: boolean;
  hasOpenFlames: boolean;
  hasPropaneHeaters: boolean;
  hasSmokeMachines: boolean;
  hasAlarmBypass: boolean;
  hasSmoking: boolean;
  hasPracticalStove: boolean;
  hasGrillingFoodPrep: boolean;
  hasStunts: boolean;
  hasLandscapeAlteration: boolean;
  hasSignRemoval: boolean;
  hasDiggingDrilling: boolean;
  hasNailingBolting: boolean;
  hasHeavyEquipmentOnGrass: boolean;
  hasCranes: boolean;
  locationTypes: string[];
  isRecParkProperty?: boolean;
  fillingOutsideBusinessHours?: boolean;
  submissionDate: string;
  isConsecutiveDays?: boolean;
}

export interface Suggestion {
  id: string;
  tier: 1 | 2 | 3 | 4 | 5;
  headline: string;
  body: string;
  appliesTo: string[];
}

export interface FeeBreakdown {
  applicationFee: number;
  notificationPerLocation: number;
  lafdSpotCheck: number;
  estimatedTotal: number;
  savingsPercent: number;
  standardTierEstimate: number;
}

export interface EvaluationResult {
  state: ResultState;
  blockers: Rule[];
  reviewTriggers: Rule[];
  appliedSuggestions: Suggestion[];
  feeMath: FeeBreakdown;
  primaryBlocker?: Rule;
}
