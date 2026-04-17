import { describe, it, expect } from 'vitest';
import {
  calculateFees,
  getJurisdictionBycdtfaName,
  getAllJurisdictions,
  getActivities,
  DEFAULT_INPUTS,
  ShootInputs,
} from './feeCalculator';

// Helper: merge overrides onto DEFAULT_INPUTS
function shoot(overrides: Partial<ShootInputs>): ShootInputs {
  return { ...DEFAULT_INPUTS, ...overrides };
}

// Helper: find a line item by id
function item(result: ReturnType<typeof calculateFees>, id: string) {
  return result.lineItems.find(li => li.id === id);
}

// ─── Helpers ───

describe('getJurisdictionBycdtfaName', () => {
  it('resolves LOS ANGELES to LA City', () => {
    const j = getJurisdictionBycdtfaName('LOS ANGELES');
    expect(j).not.toBeNull();
    expect(j.slug).toBe('los-angeles');
  });

  it('resolves LOS ANGELES COUNTY', () => {
    const j = getJurisdictionBycdtfaName('LOS ANGELES COUNTY');
    expect(j.slug).toBe('los-angeles-county');
  });

  it('resolves CULVER CITY', () => {
    const j = getJurisdictionBycdtfaName('CULVER CITY');
    expect(j.slug).toBe('culver-city');
  });

  it('returns null for unknown name', () => {
    expect(getJurisdictionBycdtfaName('NARNIA')).toBeNull();
  });
});

describe('getAllJurisdictions', () => {
  it('returns 3 jurisdictions', () => {
    expect(getAllJurisdictions()).toHaveLength(3);
  });
});

describe('getActivities', () => {
  it('returns 8 activities', () => {
    expect(getActivities()).toHaveLength(8);
  });
});

// ─── Unknown jurisdiction ───

describe('calculateFees — unknown jurisdiction', () => {
  it('returns empty result with warning', () => {
    const r = calculateFees(shoot({ jurisdictionSlug: 'atlantis' }));
    expect(r.lineItems).toHaveLength(0);
    expect(r.estimatedTotal).toBe(0);
    expect(r.warnings).toContain('Jurisdiction not found in database');
  });
});

// ─── FilmLA base fees (jurisdiction-agnostic tier) ───

describe('calculateFees — FilmLA base fees', () => {
  it('charges $931 motion application', () => {
    const r = calculateFees(shoot({ jurisdictionSlug: 'los-angeles' }));
    expect(item(r, 'filmla_app')!.amount).toBe(931);
  });

  it('charges $104 still photo for crew < 16', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      isMotion: false,
      crewSize: 10,
    }));
    expect(item(r, 'filmla_app')!.amount).toBe(104);
  });

  it('charges $931 still photo for crew >= 16 and warns', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      isMotion: false,
      crewSize: 16,
    }));
    expect(item(r, 'filmla_app')!.amount).toBe(931);
    expect(r.warnings.some(w => w.includes('16+'))).toBe(true);
  });

  it('charges $52 student simple (no activities)', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      isStudent: true,
      selectedActivities: [],
    }));
    expect(item(r, 'filmla_app')!.amount).toBe(52);
    expect(item(r, 'filmla_app')!.name).toContain('Simple');
  });

  it('charges $134 student complex (with activities)', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      isStudent: true,
      selectedActivities: ['drone_aerial'],
    }));
    expect(item(r, 'filmla_app')!.amount).toBe(134);
    expect(item(r, 'filmla_app')!.name).toContain('Complex');
  });

  it('charges $73 non-profit permit', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      isNonProfit: true,
    }));
    expect(item(r, 'filmla_app')!.amount).toBe(73);
  });

  it('always charges $232 notification fee', () => {
    const r = calculateFees(shoot({ jurisdictionSlug: 'los-angeles' }));
    expect(item(r, 'filmla_notification')!.amount).toBe(232);
  });

  it('computes monitor as (hoursPerDay + 1) × $44.50 × shootDays', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      hoursPerDay: 12,
      shootDays: 2,
    }));
    // (12 + 1) × 44.50 × 2 = 1157
    expect(item(r, 'filmla_monitor')!.amount).toBe(1157);
  });

  it('adds rider fee for shoots >7 days', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      shootDays: 10,
    }));
    const rider = item(r, 'filmla_riders');
    expect(rider).toBeDefined();
    // ceil((10-7)/7) = 1 rider × $148.75
    expect(rider!.amount).toBe(148.75);
  });

  it('computes 2 riders for 15-day shoot', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      shootDays: 15,
    }));
    // ceil((15-7)/7) = ceil(8/7) = 2
    expect(item(r, 'filmla_riders')!.amount).toBe(148.75 * 2);
  });

  it('warns when locations exceed 5', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      numberOfLocations: 6,
    }));
    expect(r.warnings.some(w => w.includes('6 locations'))).toBe(true);
  });
});

// ─── Activity admin fees (FilmLA level) ───

describe('calculateFees — activity admin fees', () => {
  it('adds $78/location for street_closure', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['street_closure'],
      numberOfLocations: 2,
    }));
    expect(item(r, 'filmla_lane_admin')!.amount).toBe(78 * 2);
  });

  it('adds $78/location for gunfire_sfx', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['gunfire_sfx'],
    }));
    expect(item(r, 'filmla_gunfire_admin')!.amount).toBe(78);
  });

  it('adds $78/location for pyrotechnics', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['pyrotechnics'],
    }));
    expect(item(r, 'filmla_sfx_admin')!.amount).toBe(78);
  });

  it('adds $78/location for drone_aerial', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['drone_aerial'],
    }));
    expect(item(r, 'filmla_drone_admin')!.amount).toBe(78);
  });

  it('stacks admin fees for multiple activities', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['street_closure', 'pyrotechnics', 'drone_aerial'],
    }));
    expect(item(r, 'filmla_lane_admin')).toBeDefined();
    expect(item(r, 'filmla_sfx_admin')).toBeDefined();
    expect(item(r, 'filmla_drone_admin')).toBeDefined();
  });
});

// ─── LA City jurisdiction fees ───

describe('calculateFees — LA City', () => {
  const la = (o: Partial<ShootInputs> = {}) =>
    calculateFees(shoot({ jurisdictionSlug: 'los-angeles', ...o }));

  it('adds LAFD spot check ($287) for crew >= 16', () => {
    const r = la({ crewSize: 20 });
    expect(item(r, 'la_fire_spot_check')!.amount).toBe(287);
  });

  it('skips spot check for crew < 16', () => {
    const r = la({ crewSize: 15 });
    expect(item(r, 'la_fire_spot_check')).toBeUndefined();
  });

  it('adds fire safety officer for pyrotechnics', () => {
    const r = la({ selectedActivities: ['pyrotechnics'], hoursPerDay: 12 });
    // max(4, 12) + 1 travel = 13 hrs × $127 × 1 day
    expect(item(r, 'la_fire_safety')!.amount).toBe(127 * 13);
  });

  it('adds fire safety officer for gunfire_sfx', () => {
    const r = la({ selectedActivities: ['gunfire_sfx'], hoursPerDay: 8 });
    // max(4, 8) + 1 = 9 hrs × $127
    expect(item(r, 'la_fire_safety')!.amount).toBe(127 * 9);
  });

  it('uses 4hr minimum when shoot is shorter', () => {
    const r = la({ selectedActivities: ['pyrotechnics'], hoursPerDay: 2 });
    // max(4, 2) + 1 = 5 hrs × $127
    expect(item(r, 'la_fire_safety')!.amount).toBe(127 * 5);
  });

  it('adds lane closure + LAPD for street_closure', () => {
    const r = la({
      selectedActivities: ['street_closure'],
      hoursPerDay: 12,
      shootDays: 1,
      numberOfLocations: 1,
    });
    expect(item(r, 'la_lane_closure')!.amount).toBe(312);
    // LAPD: avg((67.19 + 77.90)/2) = 72.545, × max(8,12) × 1
    const lapd = item(r, 'la_lapd')!;
    expect(lapd.amount).toBeCloseTo(72.545 * 12, 1);
    expect(lapd.isEstimate).toBe(true);
    expect(lapd.paidDirectly).toBe(true);
  });

  it('enforces LAPD 8hr minimum', () => {
    const r = la({
      selectedActivities: ['street_closure'],
      hoursPerDay: 4,
    });
    // max(8, 4) = 8 hrs
    expect(item(r, 'la_lapd')!.amount).toBeCloseTo(72.545 * 8, 1);
  });

  it('adds parks fees for parks location', () => {
    const r = la({
      isParksLocation: true,
      shootDays: 2,
      hoursPerDay: 10,
      prepDays: 1,
      strikeDays: 1,
    });
    expect(item(r, 'la_parks_use')!.amount).toBe(450 * 2);
    expect(item(r, 'la_parks_prep')!.amount).toBe(150 * 2); // 1 prep + 1 strike
    // monitor: 38/hr × (10+1) × 2 days
    expect(item(r, 'la_parks_monitor')!.amount).toBe(38 * 11 * 2);
    expect(item(r, 'la_parks_monitor_reporting')!.amount).toBe(76 * 2);
  });

  it('skips parks prep when prepDays is 0', () => {
    const r = la({ isParksLocation: true, prepDays: 0, strikeDays: 0 });
    expect(item(r, 'la_parks_prep')).toBeUndefined();
  });

  it('adds port use fee for port location', () => {
    const r = la({ isPortLocation: true, shootDays: 3 });
    expect(item(r, 'la_port_use')!.amount).toBe(300 * 3);
  });
});

// ─── LA County jurisdiction fees ───

describe('calculateFees — LA County', () => {
  const lac = (o: Partial<ShootInputs> = {}) =>
    calculateFees(shoot({ jurisdictionSlug: 'los-angeles-county', ...o }));

  it('adds fire filming review ($343.30) for motion', () => {
    const r = lac();
    expect(item(r, 'lac_fire_review')!.amount).toBeCloseTo(343.30, 2);
  });

  it('adds fire still photo review ($277) for 16+ crew stills', () => {
    const r = lac({ isMotion: false, crewSize: 16 });
    expect(item(r, 'lac_fire_review')!.amount).toBe(277);
  });

  it('skips fire review for still photo < 16 crew', () => {
    const r = lac({ isMotion: false, crewSize: 10 });
    expect(item(r, 'lac_fire_review')).toBeUndefined();
  });

  it('adds SFX permit + fire safety officer for pyrotechnics', () => {
    const r = lac({
      selectedActivities: ['pyrotechnics'],
      hoursPerDay: 12,
      shootDays: 1,
    });
    expect(item(r, 'lac_sfx_permit')!.amount).toBe(350);
    // FSO: 230.19 × max(4,12) × 1 = 230.19 × 12
    expect(item(r, 'lac_fso')!.amount).toBeCloseTo(230.19 * 12, 1);
    expect(item(r, 'lac_fso')!.paidDirectly).toBe(true);
  });

  it('uses 4hr minimum for short-day pyro', () => {
    const r = lac({
      selectedActivities: ['pyrotechnics'],
      hoursPerDay: 2,
    });
    expect(item(r, 'lac_fso')!.amount).toBeCloseTo(230.19 * 4, 1);
  });

  it('adds roads fees + sheriff for street_closure', () => {
    const r = lac({
      selectedActivities: ['street_closure'],
      hoursPerDay: 12,
      shootDays: 1,
      numberOfLocations: 1,
    });
    expect(item(r, 'lac_roads_inspection')!.amount).toBe(468);
    expect(item(r, 'lac_roads_encroachment')!.amount).toBe(387);
    expect(item(r, 'lac_roads_app')!.amount).toBe(214);
    // Sheriff: 95.11 × max(6,12) × 1
    const sheriff = item(r, 'lac_sheriff')!;
    expect(sheriff.amount).toBeCloseTo(95.11 * 12, 1);
    expect(sheriff.paidDirectly).toBe(true);
  });

  it('enforces sheriff 6hr minimum', () => {
    const r = lac({
      selectedActivities: ['street_closure'],
      hoursPerDay: 4,
    });
    expect(item(r, 'lac_sheriff')!.amount).toBeCloseTo(95.11 * 6, 1);
  });

  it('adds beach use + basic prep/strike', () => {
    const r = lac({
      isBeachLocation: true,
      shootDays: 2,
      prepDays: 1,
      strikeDays: 1,
    });
    expect(item(r, 'lac_beach_use')!.amount).toBe(400 * 2);
    // 2 prep/strike days, all within first 3 → 2 × $100
    expect(item(r, 'lac_beach_prep')!.amount).toBe(200);
  });

  it('tiers beach prep/strike: $100 first 3, $400 after', () => {
    const r = lac({
      isBeachLocation: true,
      shootDays: 1,
      prepDays: 2,
      strikeDays: 2,
    });
    // totalPrepStrike=4, basic=3×100=300, extended=1×400=400
    expect(item(r, 'lac_beach_prep')!.amount).toBe(700);
    expect(item(r, 'lac_beach_prep')!.note).toContain('$400/day after');
  });

  it('skips beach prep when no prep/strike days', () => {
    const r = lac({ isBeachLocation: true, prepDays: 0, strikeDays: 0 });
    expect(item(r, 'lac_beach_prep')).toBeUndefined();
  });

  it('adds parks filming use for parks location', () => {
    const r = lac({ isParksLocation: true, shootDays: 3 });
    expect(item(r, 'lac_parks_use')!.amount).toBe(400 * 3);
  });

  it('adds flood control permit + use fee covering all days', () => {
    const r = lac({
      isFloodControlLocation: true,
      shootDays: 2,
      prepDays: 1,
      strikeDays: 1,
    });
    expect(item(r, 'lac_flood_permit')!.amount).toBe(174);
    // Use: 1181 × (2+1+1) = 4724
    expect(item(r, 'lac_flood_use')!.amount).toBe(1181 * 4);
    expect(r.warnings.some(w => w.includes('1,181'))).toBe(true);
  });
});

// ─── Culver City jurisdiction fees ───

describe('calculateFees — Culver City', () => {
  const cc = (o: Partial<ShootInputs> = {}) =>
    calculateFees(shoot({ jurisdictionSlug: 'culver-city', ...o }));

  it('charges Culver City application ($660) on top of FilmLA', () => {
    const r = cc();
    expect(item(r, 'cc_application')!.amount).toBe(660);
    expect(item(r, 'filmla_app')!.amount).toBe(931);
  });

  it('charges $350/day filming daily use for motion', () => {
    const r = cc({ shootDays: 2 });
    expect(item(r, 'cc_daily_use')!.amount).toBe(350 * 2);
  });

  it('charges $75/day still photo daily use', () => {
    const r = cc({ isMotion: false, crewSize: 10 });
    expect(item(r, 'cc_daily_use')!.amount).toBe(75);
  });

  it('always charges fire spot check ($95/location)', () => {
    const r = cc({ numberOfLocations: 3 });
    expect(item(r, 'cc_fire_spot')!.amount).toBe(95 * 3);
  });

  it('adds weekday police for street closure (8hr base + extra hrs)', () => {
    const r = cc({
      selectedActivities: ['street_closure'],
      isWeekend: false,
      hoursPerDay: 12,
      shootDays: 1,
    });
    // base=630, extra=max(0,12-8)=4 × 108=432, total=1062
    expect(item(r, 'cc_police')!.amount).toBe(1062);
  });

  it('no extra police cost for <=8 hour weekday', () => {
    const r = cc({
      selectedActivities: ['street_closure'],
      isWeekend: false,
      hoursPerDay: 8,
    });
    expect(item(r, 'cc_police')!.amount).toBe(630);
  });

  it('adds weekend/holiday police rate for street closure', () => {
    const r = cc({
      selectedActivities: ['street_closure'],
      isWeekend: true,
      shootDays: 2,
    });
    expect(item(r, 'cc_police')!.amount).toBe(840 * 2);
  });

  it('adds weekday fire officer for pyrotechnics', () => {
    const r = cc({
      selectedActivities: ['pyrotechnics'],
      isWeekend: false,
      hoursPerDay: 12,
      shootDays: 1,
    });
    // base=695, extra=4×108=432, total=1127
    expect(item(r, 'cc_fire_officer')!.amount).toBe(1127);
  });

  it('adds weekend fire officer for gunfire_sfx', () => {
    const r = cc({
      selectedActivities: ['gunfire_sfx'],
      isWeekend: true,
      shootDays: 1,
    });
    expect(item(r, 'cc_fire_officer')!.amount).toBe(925);
  });

  it('adds parking posting fee', () => {
    const r = cc({
      numberOfParkingSpaces: 5,
      shootDays: 2,
    });
    // 8 × 5 × 2 = 80
    expect(item(r, 'cc_posting')!.amount).toBe(80);
  });

  it('skips parking when numberOfParkingSpaces is 0', () => {
    const r = cc({ numberOfParkingSpaces: 0 });
    expect(item(r, 'cc_posting')).toBeUndefined();
  });
});

// ─── Subtotal aggregation ───

describe('calculateFees — subtotals', () => {
  it('sums categories correctly for LA City with activities and parks', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      shootDays: 1,
      hoursPerDay: 12,
      crewSize: 20,
      selectedActivities: ['street_closure'],
      isParksLocation: true,
      prepDays: 1,
      strikeDays: 0,
    }));

    // FilmLA: app(931) + notification(232) + lane_admin(78) + monitor(44.5×13×1=578.5)
    expect(r.subtotalFilmLA).toBeCloseTo(1819.5, 1);

    // Jurisdiction: spot_check(287) + lane_closure(312)
    expect(r.subtotalJurisdiction).toBeCloseTo(599, 1);

    // Personnel: LAPD(72.545×12=870.54) + parks_monitor(38×13×1=494) + parks_monitor_reporting(76×1=76)
    expect(r.subtotalPersonnel).toBeCloseTo(870.54 + 494 + 76, 0);

    // Location: parks_use(450) + parks_prep(150×1=150)
    expect(r.subtotalLocation).toBeCloseTo(600, 1);

    // Total
    expect(r.estimatedTotal).toBeCloseTo(
      r.subtotalFilmLA + r.subtotalJurisdiction + r.subtotalPersonnel + r.subtotalLocation,
      1,
    );
  });
});

// ─── Timeline & lead days ───

describe('calculateFees — timeline', () => {
  it('returns 5 standard lead days for a simple shoot', () => {
    const r = calculateFees(shoot({ jurisdictionSlug: 'los-angeles' }));
    expect(r.complexTimeline).toBe(false);
    expect(r.estimatedLeadDays).toBe(5);
  });

  it('sets complexTimeline for street_closure', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['street_closure'],
    }));
    expect(r.complexTimeline).toBe(true);
    expect(r.estimatedLeadDays).toBe(10);
  });

  it('picks highest lead days across multiple activities', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['street_closure', 'pyrotechnics'],
    }));
    // pyrotechnics: additionalLeadDays=10 → 5+10=15
    // street_closure: additionalLeadDays=5 → 5+5=10
    // max = 15
    expect(r.estimatedLeadDays).toBe(15);
  });

  it('sets complexTimeline for stunts (data-only activity)', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['stunts'],
    }));
    // stunts triggers complex via activities.json metadata
    expect(r.complexTimeline).toBe(true);
    expect(r.estimatedLeadDays).toBe(10); // 5+5
  });

  it('adds lead days for night_shoot (non-complex)', () => {
    const r = calculateFees(shoot({
      jurisdictionSlug: 'los-angeles',
      selectedActivities: ['night_shoot'],
    }));
    expect(r.complexTimeline).toBe(false);
    expect(r.estimatedLeadDays).toBe(8); // 5+3
  });
});

// ─── whatPeopleMiss ───

describe('calculateFees — whatPeopleMiss', () => {
  it('returns whatPeopleMiss from jurisdiction data', () => {
    const r = calculateFees(shoot({ jurisdictionSlug: 'los-angeles' }));
    expect(r.whatPeopleMiss.length).toBeGreaterThan(0);
    expect(r.whatPeopleMiss.some(w => w.includes('LAFD'))).toBe(true);
  });
});
