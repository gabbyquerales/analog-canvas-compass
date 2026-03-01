// Fee Calculator for Film Permits
// Separates fee LOGIC from fee DATA
// JSON files store rates, this module applies conditional rules

import filmlaBaseFees from '@/data/filmla-base-fees.json';
import jurisdictionsData from '@/data/jurisdictions.json';
import activitiesData from '@/data/activities.json';

// âââ Types âââ

export interface ShootInputs {
  jurisdictionSlug: string;
  shootDays: number;
  hoursPerDay: number;
  crewSize: number;
  isMotion: boolean; // false = still photo
  isStudent: boolean;
  isNonProfit: boolean;
  selectedActivities: string[]; // activity IDs
  isWeekend: boolean;
  // Location type flags
  isParksLocation: boolean;
  isBeachLocation: boolean;
  isBuildingLocation: boolean;
  isPortLocation: boolean;
  isDWPLocation: boolean;
  isFloodControlLocation: boolean;
  numberOfLocations: number;
  numberOfParkingSpaces: number;
  cateringCrewSize: number;
  numberOfCars: number;
  prepDays: number;
  strikeDays: number;
}

export interface FeeLineItem {
  id: string;
  name: string;
  amount: number;
  per: string;
  department?: string;
  note?: string;
  category: 'filmla' | 'jurisdiction' | 'personnel' | 'location';
  isEstimate?: boolean;
  paidDirectly?: boolean; // Not collected by FilmLA
}

export interface FeeCalculationResult {
  jurisdiction: typeof jurisdictionsData.jurisdictions[keyof typeof jurisdictionsData.jurisdictions];
  lineItems: FeeLineItem[];
  subtotalFilmLA: number;
  subtotalJurisdiction: number;
  subtotalPersonnel: number;
  subtotalLocation: number;
  estimatedTotal: number;
  warnings: string[];
  whatPeopleMiss: string[];
  complexTimeline: boolean;
  estimatedLeadDays: number;
}

// Default inputs for when user hasn't specified
export const DEFAULT_INPUTS: ShootInputs = {
  jurisdictionSlug: '',
  shootDays: 1,
  hoursPerDay: 12,
  crewSize: 20,
  isMotion: true,
  isStudent: false,
  isNonProfit: false,
  selectedActivities: [],
  isWeekend: false,
  isParksLocation: false,
  isBeachLocation: false,
  isBuildingLocation: false,
  isPortLocation: false,
  isDWPLocation: false,
  isFloodControlLocation: false,
  numberOfLocations: 1,
  numberOfParkingSpaces: 0,
  cateringCrewSize: 0,
  numberOfCars: 0,
  prepDays: 0,
  strikeDays: 0,
};

// âââ Helpers âââ

function getJurisdiction(slug: string) {
  const jurisdictions = jurisdictionsData.jurisdictions as Record<string, any>;
  return Object.values(jurisdictions).find((j: any) => j.slug === slug) || null;
}

export function getJurisdictionBycdtfaName(cdtfaName: string) {
  const jurisdictions = jurisdictionsData.jurisdictions as Record<string, any>;
  return Object.values(jurisdictions).find(
    (j: any) => j.cdtfaName === cdtfaName
  ) || null;
}

export function getAllJurisdictions() {
  return Object.values(jurisdictionsData.jurisdictions);
}

export function getActivities() {
  return activitiesData.activities;
}

// âââ Main Calculator âââ

export function calculateFees(inputs: ShootInputs): FeeCalculationResult {
  const jurisdiction = getJurisdiction(inputs.jurisdictionSlug);
  const lineItems: FeeLineItem[] = [];
  const warnings: string[] = [];
  let complexTimeline = false;
  let maxLeadDays = jurisdiction?.minLeadDaysStandard || 5;

  if (!jurisdiction) {
    return {
      jurisdiction: null as any,
      lineItems: [],
      subtotalFilmLA: 0,
      subtotalJurisdiction: 0,
      subtotalPersonnel: 0,
      subtotalLocation: 0,
      estimatedTotal: 0,
      warnings: ['Jurisdiction not found in database'],
      whatPeopleMiss: [],
      complexTimeline: false,
      estimatedLeadDays: 5,
    };
  }

  // ââ TIER 1: FilmLA Base Fees ââ
  const baseFees = filmlaBaseFees.fees;

  // Application fee
  if (inputs.isStudent) {
    const isComplex = inputs.selectedActivities.length > 0;
    lineItems.push({
      id: 'filmla_app',
      name: isComplex ? 'Student Permit (Complex)' : 'Student Permit (Simple)',
      amount: isComplex ? baseFees.student_permit_complex.rate : baseFees.student_permit_simple.rate,
      per: 'permit',
      category: 'filmla',
    });
  } else if (inputs.isNonProfit) {
    lineItems.push({
      id: 'filmla_app',
      name: 'Non-Profit (PSA) Permit App',
      amount: baseFees.nonprofit_psa_app.rate,
      per: 'permit',
      category: 'filmla',
    });
  } else if (inputs.isMotion) {
    lineItems.push({
      id: 'filmla_app',
      name: 'Permit Application Fee',
      amount: baseFees.permit_application.rate,
      per: 'permit',
      category: 'filmla',
      note: 'Up to 5 locations, 7 consecutive days',
    });

    // Extra riders if >7 days or >5 locations
    if (inputs.shootDays > 7) {
      const extraRiders = Math.ceil((inputs.shootDays - 7) / 7);
      lineItems.push({
        id: 'filmla_riders',
        name: `Permit Rider(s) Ã ${extraRiders}`,
        amount: baseFees.permit_rider_business_hours.rate * extraRiders,
        per: 'rider',
        category: 'filmla',
        note: 'Additional 7-day blocks',
      });
    }

    if (inputs.numberOfLocations > 5) {
      warnings.push(`Your ${inputs.numberOfLocations} locations exceed the base 5 included in the permit â additional rider fees may apply.`);
    }
  } else {
    // Still photo
    if (inputs.crewSize >= 16) {
      lineItems.push({
        id: 'filmla_app',
        name: 'Still Photo App (Motion Rate â 16+ crew)',
        amount: baseFees.permit_application.rate,
        per: 'permit',
        category: 'filmla',
        note: 'Crew of 16+ requires Motion application fee',
      });
      warnings.push('Still photo crew of 16+ triggers Motion application rate ($931 instead of $104).');
    } else {
      lineItems.push({
        id: 'filmla_app',
        name: 'Still Photo Application Fee',
        amount: baseFees.still_photo_application.rate,
        per: 'permit',
        category: 'filmla',
      });
    }
  }

  // Notification fee
  lineItems.push({
    id: 'filmla_notification',
    name: 'Notification Fee',
    amount: baseFees.notification_fee.rate,
    per: 'radius',
    category: 'filmla',
  });

  // Activity admin fees (FilmLA-level)
  for (const activityId of inputs.selectedActivities) {
    switch (activityId) {
      case 'street_closure':
        lineItems.push({
          id: 'filmla_lane_admin',
          name: 'Lane Closure Administration',
          amount: baseFees.lane_closure_admin.rate * inputs.numberOfLocations,
          per: 'involved location',
          category: 'filmla',
        });
        complexTimeline = true;
        maxLeadDays = Math.max(maxLeadDays, jurisdiction.minLeadDaysComplex || 10);
        break;
      case 'gunfire_sfx':
        lineItems.push({
          id: 'filmla_gunfire_admin',
          name: 'Gunfire Administration',
          amount: baseFees.gunfire_admin.rate * inputs.numberOfLocations,
          per: 'involved location',
          category: 'filmla',
        });
        complexTimeline = true;
        maxLeadDays = Math.max(maxLeadDays, jurisdiction.minLeadDaysComplex || 10);
        break;
      case 'pyrotechnics':
        lineItems.push({
          id: 'filmla_sfx_admin',
          name: 'Special FX Administration',
          amount: baseFees.special_fx_admin.rate * inputs.numberOfLocations,
          per: 'involved location',
          category: 'filmla',
        });
        complexTimeline = true;
        maxLeadDays = Math.max(maxLeadDays, jurisdiction.minLeadDaysComplex || 10);
        break;
      case 'drone_aerial':
        lineItems.push({
          id: 'filmla_drone_admin',
          name: 'Drone Administration',
          amount: baseFees.drone_admin.rate * inputs.numberOfLocations,
          per: 'involved location',
          category: 'filmla',
        });
        complexTimeline = true;
        maxLeadDays = Math.max(maxLeadDays, jurisdiction.minLeadDaysComplex || 10);
        break;
    }
  }

  // FilmLA Monitor (always applicable)
  const monitorHours = inputs.hoursPerDay + 1; // +1 hour arrival before permit start
  lineItems.push({
    id: 'filmla_monitor',
    name: 'FilmLA Monitor',
    amount: baseFees.filmla_monitor.rate * monitorHours * inputs.shootDays,
    per: `${monitorHours}hrs Ã ${inputs.shootDays} days`,
    category: 'filmla',
    note: 'Includes 1hr early arrival. Subject to OT/DT.',
  });

  // ââ TIER 2: Jurisdiction-specific fees ââ
  const jFees = jurisdiction.fees as Record<string, any>;

  // ââ LA CITY specific logic ââ
  if (inputs.jurisdictionSlug === 'los-angeles') {
    // LAFD Spot Check (auto for 16+ crew)
    if (inputs.crewSize >= 16) {
      lineItems.push({
        id: 'la_fire_spot_check',
        name: 'LAFD Spot Check Surcharge',
        amount: jFees.fire_spot_check.rate,
        per: 'permit',
        category: 'jurisdiction',
        department: 'LA City Fire Department',
        note: 'Automatic for crews of 16+',
      });
    }

    // Fire Safety Officer for pyro/sfx
    if (inputs.selectedActivities.includes('pyrotechnics') || inputs.selectedActivities.includes('gunfire_sfx')) {
      const fireHours = Math.max(jFees.fire_safety_officer.minimumHours, inputs.hoursPerDay) + jFees.fire_safety_officer.travelHours;
      lineItems.push({
        id: 'la_fire_safety',
        name: 'Fire Safety Officer',
        amount: jFees.fire_safety_officer.rate * fireHours * inputs.shootDays,
        per: `${fireHours}hrs Ã ${inputs.shootDays} days`,
        category: 'personnel',
        department: 'LA City Fire Department',
        note: `${jFees.fire_safety_officer.minimumHours}hr min + 1hr travel`,
      });
    }

    // Street closure
    if (inputs.selectedActivities.includes('street_closure')) {
      lineItems.push({
        id: 'la_lane_closure',
        name: 'Lane & Street Closure Fee',
        amount: jFees.lane_street_closure.rate * inputs.numberOfLocations,
        per: 'involved location',
        category: 'jurisdiction',
        department: 'LA City',
      });

      // LAPD officer for traffic
      const lapdHours = Math.max(jFees.lapd_retired_off_duty.minimumHours || 8, inputs.hoursPerDay);
      lineItems.push({
        id: 'la_lapd',
        name: 'LAPD Officer (Retired/Off-Duty)',
        amount: ((jFees.lapd_retired_off_duty.rateMin + jFees.lapd_retired_off_duty.rateMax) / 2) * lapdHours * inputs.shootDays,
        per: `~${lapdHours}hrs Ã ${inputs.shootDays} days`,
        category: 'personnel',
        department: 'LAPD',
        note: `8hr minimum. $67-78/hr range. Paid directly to provider`,
        isEstimate: true,
        paidDirectly: true,
      });
    }

    // Parks location
    if (inputs.isParksLocation) {
      lineItems.push({
        id: 'la_parks_use',
        name: 'Rec & Parks â Film Use',
        amount: jFees.rec_parks_film_use.rate * inputs.shootDays,
        per: `${inputs.shootDays} days`,
        category: 'location',
        department: 'LA Dept of Rec & Parks',
      });

      if (inputs.prepDays > 0) {
        lineItems.push({
          id: 'la_parks_prep',
          name: 'Rec & Parks â Prep/Strike',
          amount: jFees.rec_parks_prep_strike.rate * (inputs.prepDays + inputs.strikeDays),
          per: `${inputs.prepDays + inputs.strikeDays} days`,
          category: 'location',
          department: 'LA Dept of Rec & Parks',
        });
      }

      // Parks monitor
      lineItems.push({
        id: 'la_parks_monitor',
        name: 'Rec & Parks Monitor',
        amount: jFees.rec_parks_monitor.rate * (inputs.hoursPerDay + 1) * inputs.shootDays,
        per: 'hour',
        category: 'personnel',
        department: 'LA Dept of Rec & Parks',
      });

      lineItems.push({
        id: 'la_parks_monitor_reporting',
        name: 'Rec & Parks Monitor Reporting',
        amount: jFees.rec_parks_monitor_reporting.rate * inputs.shootDays,
        per: 'shift',
        category: 'personnel',
        department: 'LA Dept of Rec & Parks',
      });
    }

    // Port location
    if (inputs.isPortLocation) {
      lineItems.push({
        id: 'la_port_use',
        name: 'Port of LA â Use Fee',
        amount: jFees.port_use_fee.rate * inputs.shootDays,
        per: `${inputs.shootDays} days`,
        category: 'location',
        department: 'Port of Los Angeles',
      });
    }
  }

  // ââ LA COUNTY specific logic ââ
  if (inputs.jurisdictionSlug === 'los-angeles-county') {
    // Fire filming review (always)
    if (inputs.isMotion) {
      lineItems.push({
        id: 'lac_fire_review',
        name: 'County Fire â Filming Review',
        amount: jFees.fire_filming_review.rate,
        per: 'permit',
        category: 'jurisdiction',
        department: 'LA County Fire',
      });
    } else if (inputs.crewSize >= 16) {
      lineItems.push({
        id: 'lac_fire_review',
        name: 'County Fire â Still Photo Review',
        amount: jFees.fire_still_photo_review.rate,
        per: 'permit',
        category: 'jurisdiction',
        department: 'LA County Fire',
        note: '16+ People',
      });
    }

    // Special effects permit
    if (inputs.selectedActivities.includes('pyrotechnics') || inputs.selectedActivities.includes('gunfire_sfx')) {
      lineItems.push({
        id: 'lac_sfx_permit',
        name: 'County Fire â Special Effects Permit',
        amount: jFees.fire_special_effects_permit.rate * inputs.numberOfLocations,
        per: 'involved location',
        category: 'jurisdiction',
        department: 'LA County Fire',
      });

      // Fire Safety Officer (mandatory for pyro)
      const fsoHours = Math.max(jFees.fire_safety_officer.minimumHours, inputs.hoursPerDay);
      lineItems.push({
        id: 'lac_fso',
        name: 'County Fire Safety Officer',
        amount: jFees.fire_safety_officer.rate * fsoHours * inputs.shootDays,
        per: `${fsoHours}hrs Ã ${inputs.shootDays} days`,
        category: 'personnel',
        department: 'LA County Fire',
        note: '4hr min, Flat Rate (No OT/DT). Paid directly to provider',
        paidDirectly: true,
      });
    }

    // Street closure â roads fees
    if (inputs.selectedActivities.includes('street_closure')) {
      lineItems.push({
        id: 'lac_roads_inspection',
        name: 'County Roads â Inspection/Use',
        amount: jFees.roads_inspection_use.rate * inputs.shootDays,
        per: `${inputs.shootDays} days`,
        category: 'jurisdiction',
        department: 'LA County Roads',
      });
      lineItems.push({
        id: 'lac_roads_encroachment',
        name: 'County Roads â Encroachment Processing',
        amount: jFees.roads_encroachment_processing.rate,
        per: 'area',
        category: 'jurisdiction',
        department: 'LA County Roads',
      });
      lineItems.push({
        id: 'lac_roads_app',
        name: 'County Roads â Application/Issuance',
        amount: jFees.roads_application_issuance.rate * inputs.numberOfLocations,
        per: 'involved location',
        category: 'jurisdiction',
        department: 'LA County Roads',
      });

      // Sheriff for traffic control
      const sheriffHours = Math.max(jFees.sheriff_officer.minimumHours, inputs.hoursPerDay);
      lineItems.push({
        id: 'lac_sheriff',
        name: 'County Sheriff Officer',
        amount: jFees.sheriff_officer.rate * sheriffHours * inputs.shootDays,
        per: `${sheriffHours}hrs Ã ${inputs.shootDays} days`,
        category: 'personnel',
        department: 'LA County Sheriff',
        note: '6hr min, Flat Rate + $1.22/mile mileage. Paid directly to provider',
        paidDirectly: true,
        isEstimate: true,
      });
    }

    // Beach location
    if (inputs.isBeachLocation) {
      lineItems.push({
        id: 'lac_beach_use',
        name: 'County Beaches â Filming Use',
        amount: jFees.beaches_filming_use.rate * inputs.shootDays,
        per: `${inputs.shootDays} days`,
        category: 'location',
        department: 'LA County Beaches',
      });

      if (inputs.prepDays > 0 || inputs.strikeDays > 0) {
        const totalPrepStrike = inputs.prepDays + inputs.strikeDays;
        const basicDays = Math.min(totalPrepStrike, 3);
        const extendedDays = Math.max(0, totalPrepStrike - 3);
        let prepCost = basicDays * jFees.beaches_prep_strike.rate;
        if (extendedDays > 0) {
          prepCost += extendedDays * jFees.beaches_prep_strike_extended.rate;
        }
        lineItems.push({
          id: 'lac_beach_prep',
          name: 'County Beaches â Prep/Strike',
          amount: prepCost,
          per: `${totalPrepStrike} days`,
          category: 'location',
          department: 'LA County Beaches',
          note: extendedDays > 0 ? `$100/day first 3 days, $400/day after` : undefined,
        });
      }
    }

    // Parks location
    if (inputs.isParksLocation) {
      lineItems.push({
        id: 'lac_parks_use',
        name: 'County Parks â Filming Use',
        amount: jFees.parks_filming_use.rate * inputs.shootDays,
        per: `${inputs.shootDays} days`,
        category: 'location',
        department: 'LA County Parks',
      });
    }

    // Flood control location
    if (inputs.isFloodControlLocation) {
      lineItems.push({
        id: 'lac_flood_permit',
        name: 'Flood Control â Permit Issuance',
        amount: jFees.flood_control_permit.rate,
        per: 'permit',
        category: 'jurisdiction',
        department: 'LA County Flood Control',
      });
      const totalFloodDays = inputs.shootDays + inputs.prepDays + inputs.strikeDays;
      lineItems.push({
        id: 'lac_flood_use',
        name: 'Flood Control â Use Fee',
        amount: jFees.flood_control_use.rate * totalFloodDays,
        per: `${totalFloodDays} days (all activity days)`,
        category: 'location',
        department: 'LA County Flood Control',
        note: 'Applies to ALL prep, strike, still photo & filming days',
      });
      warnings.push(`Flood control locations are $${jFees.flood_control_use.rate.toLocaleString()}/day â one of the highest daily rates in LA County.`);
    }
  }

  // ââ CULVER CITY specific logic ââ
  if (inputs.jurisdictionSlug === 'culver-city') {
    // Culver City's own application fee (on top of FilmLA)
    lineItems.push({
      id: 'cc_application',
      name: 'Culver City Application Fee',
      amount: jFees.city_application.rate,
      per: 'permit',
      category: 'jurisdiction',
      department: 'Culver City',
      note: 'In addition to FilmLA application fee',
    });

    // Daily use fee
    if (inputs.isMotion) {
      lineItems.push({
        id: 'cc_daily_use',
        name: 'Culver City Filming Daily Use',
        amount: jFees.filming_daily_use.rate * inputs.shootDays,
        per: `${inputs.shootDays} days`,
        category: 'jurisdiction',
        department: 'Culver City',
      });
    } else {
      lineItems.push({
        id: 'cc_daily_use',
        name: 'Culver City Still Photo Daily Use',
        amount: jFees.still_photo_daily_use.rate * inputs.shootDays,
        per: `${inputs.shootDays} days`,
        category: 'jurisdiction',
        department: 'Culver City',
      });
    }

    // Fire spot check
    lineItems.push({
      id: 'cc_fire_spot',
      name: 'Culver City Fire Spot Check',
      amount: jFees.fire_spot_check.rate * inputs.numberOfLocations,
      per: 'involved location',
      category: 'jurisdiction',
      department: 'Culver City Fire Department',
    });

    // Police officer if street closure or high-impact
    if (inputs.selectedActivities.includes('street_closure')) {
      if (inputs.isWeekend) {
        lineItems.push({
          id: 'cc_police',
          name: 'Culver City Police Officer (Weekend/Holiday)',
          amount: jFees.police_officer_weekend_holiday.rate * inputs.shootDays,
          per: `${inputs.shootDays} days`,
          category: 'personnel',
          department: 'Culver City Police',
        });
      } else {
        const basePolice = jFees.police_officer_weekday.rate;
        const extraHours = Math.max(0, inputs.hoursPerDay - 8);
        const extraCost = extraHours * jFees.police_officer_additional_hours.rate;
        lineItems.push({
          id: 'cc_police',
          name: 'Culver City Police Officer (Weekday)',
          amount: (basePolice + extraCost) * inputs.shootDays,
          per: `${inputs.shootDays} days`,
          category: 'personnel',
          department: 'Culver City Police',
          note: '8hr minimum included',
        });
      }
    }

    // Fire officer if pyro/sfx
    if (inputs.selectedActivities.includes('pyrotechnics') || inputs.selectedActivities.includes('gunfire_sfx')) {
      if (inputs.isWeekend) {
        lineItems.push({
          id: 'cc_fire_officer',
          name: 'Culver City Fire Officer (Weekend/Holiday)',
          amount: jFees.fire_officer_weekend_holiday.rate * inputs.shootDays,
          per: `${inputs.shootDays} days`,
          category: 'personnel',
          department: 'Culver City Fire',
        });
      } else {
        const baseFire = jFees.fire_officer_weekday.rate;
        const extraFireHours = Math.max(0, inputs.hoursPerDay - 8);
        const extraFireCost = extraFireHours * jFees.fire_officer_additional_hours.rate;
        lineItems.push({
          id: 'cc_fire_officer',
          name: 'Culver City Fire Officer (Weekday)',
          amount: (baseFire + extraFireCost) * inputs.shootDays,
          per: `${inputs.shootDays} days`,
          category: 'personnel',
          department: 'Culver City Fire',
          note: '8hr minimum included',
        });
      }
    }

    // Parking posting
    if (inputs.numberOfParkingSpaces > 0) {
      lineItems.push({
        id: 'cc_posting',
        name: 'Parking Posting (Non-Metered)',
        amount: jFees.posting_non_metered.rate * inputs.numberOfParkingSpaces * inputs.shootDays,
        per: `${inputs.numberOfParkingSpaces} spaces Ã ${inputs.shootDays} days`,
        category: 'jurisdiction',
        department: 'Culver City',
        note: 'Using non-metered rate â downtown/metered rates higher',
      });
    }
  }

  // ââ Calculate totals ââ
  const subtotalFilmLA = lineItems
    .filter(i => i.category === 'filmla')
    .reduce((sum, i) => sum + i.amount, 0);

  const subtotalJurisdiction = lineItems
    .filter(i => i.category === 'jurisdiction')
    .reduce((sum, i) => sum + i.amount, 0);

  const subtotalPersonnel = lineItems
    .filter(i => i.category === 'personnel')
    .reduce((sum, i) => sum + i.amount, 0);

  const subtotalLocation = lineItems
    .filter(i => i.category === 'location')
    .reduce((sum, i) => sum + i.amount, 0);

  const estimatedTotal = subtotalFilmLA + subtotalJurisdiction + subtotalPersonnel + subtotalLocation;

  // Activity-driven lead days
  for (const actId of inputs.selectedActivities) {
    const activity = activitiesData.activities.find(a => a.id === actId);
    if (activity) {
      if (activity.triggersComplexTimeline) complexTimeline = true;
      maxLeadDays = Math.max(maxLeadDays, (jurisdiction.minLeadDaysStandard || 5) + (activity.additionalLeadDays || 0));
    }
  }

  return {
    jurisdiction,
    lineItems,
    subtotalFilmLA,
    subtotalJurisdiction,
    subtotalPersonnel,
    subtotalLocation,
    estimatedTotal,
    warnings,
    whatPeopleMiss: jurisdiction.whatPeopleMiss || [],
    complexTimeline,
    estimatedLeadDays: maxLeadDays,
  };
}

// ——— Estimate helpers (for Phase B frontend) ———

export interface EstimateFeeInput {
  rate?: number | null;
  rate_low?: number | null;
  rate_high?: number | null;
  collected_by?: 'filmla' | 'direct';
  quantity?: number;
  minimum_units?: number;
}

export interface EstimateResult {
  low: number;
  mid: number;
  high: number;
  hasRange: boolean;
}

export function calculateEstimate(fees: EstimateFeeInput[]): EstimateResult {
  let totalLow = 0;
  let totalHigh = 0;

  for (const fee of fees) {
    const quantity = fee.quantity || fee.minimum_units || 1;

    if (fee.rate !== null && fee.rate !== undefined) {
      totalLow += fee.rate * quantity;
      totalHigh += fee.rate * quantity;
    } else if (fee.rate_low !== null && fee.rate_low !== undefined &&
               fee.rate_high !== null && fee.rate_high !== undefined) {
      totalLow += fee.rate_low * quantity;
      totalHigh += fee.rate_high * quantity;
    }
  }

  const totalMid = (totalLow + totalHigh) / 2;

  return {
    low: Math.round(totalLow * 100) / 100,
    mid: Math.round(totalMid * 100) / 100,
    high: Math.round(totalHigh * 100) / 100,
    hasRange: totalLow !== totalHigh,
  };
}

export function groupFeesByCollector(fees: EstimateFeeInput[]) {
  return {
    filmla: fees.filter(f => f.collected_by === 'filmla'),
    direct: fees.filter(f => f.collected_by === 'direct'),
  };
}
