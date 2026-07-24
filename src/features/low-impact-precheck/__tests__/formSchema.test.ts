import { describe, it, expect } from 'vitest';
import { FORM_FIELDS } from '../formSchema';
import { REC_PARKS_SCOPED_ACTIVITY_IDS } from '../rules';
import { RESULT_COPY } from '../copy';

function field(id: string) {
  const f = FORM_FIELDS.find((f) => f.id === id);
  if (!f) throw new Error(`Missing form field: ${id}`);
  return f;
}

// ──────────────────────────────────────────────
// F1 — the six Rec & Parks-scoped questions are gated in the form
// ──────────────────────────────────────────────

describe('formSchema — Rec & Parks-scoped questions gated (F1)', () => {
  it('recParksActivities multiselect only visible when isRecParkProperty is true', () => {
    const f = field('recParksActivities');
    expect(f.type).toBe('multiselect');
    expect(f.visibleWhen).toEqual({ fieldId: 'isRecParkProperty', equals: true });
  });

  it('recParksActivities options are exactly the six Rec & Parks-scoped rule IDs', () => {
    const values = field('recParksActivities').options?.map((o) => o.value);
    expect(values).toEqual([...REC_PARKS_SCOPED_ACTIVITY_IDS]);
  });

  it('the old per-flag boolean questions are gone', () => {
    const oldIds = [
      'hasLandscapeAlteration',
      'hasSignRemoval',
      'hasDiggingDrilling',
      'hasNailingBolting',
      'hasHeavyEquipmentOnGrass',
      'hasCranes',
    ];
    for (const id of oldIds) {
      expect(FORM_FIELDS.some((f) => f.id === id)).toBe(false);
    }
  });

  it('isRecParkProperty is shown for park locations, not just city buildings', () => {
    const vw = field('isRecParkProperty').visibleWhen;
    expect(vw?.includesAny).toContain('park');
    expect(vw?.includesAny).toContain('city_buildings');
  });
});

// ──────────────────────────────────────────────
// F2 — qualifies copy reflects the real location limit
// ──────────────────────────────────────────────

describe('copy — qualifies body (F2)', () => {
  it('says "three or fewer filming locations", not "a single location"', () => {
    expect(RESULT_COPY.qualifies.bodyParagraph).toContain('three or fewer filming locations');
    expect(RESULT_COPY.qualifies.bodyParagraph).not.toContain('a single location');
  });
});

// ──────────────────────────────────────────────
// F4 — locationCount help text excludes parking/base camp
// ──────────────────────────────────────────────

describe('formSchema — locationCount helpText (F4)', () => {
  it('tells users parking and base camp locations don\'t count', () => {
    const helpText = field('locationCount').helpText ?? '';
    expect(helpText).toMatch(/parking/i);
    expect(helpText).toMatch(/base camp/i);
  });
});
