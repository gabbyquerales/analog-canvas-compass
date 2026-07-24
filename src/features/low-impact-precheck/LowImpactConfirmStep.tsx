// Confirm step for main-flow Low Impact detection: collects only the inputs the
// Production Brief doesn't capture (docs/OVERVIEW.md § Direction decided).
// Functional styling only — visual polish happens in Lovable after merge.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FORM_FIELDS } from './formSchema';
import { ADDITIONAL_ACTIVITY_OPTIONS, type LowImpactConfirmInputs } from './mainFlowAdapter';
import { RESULT_CARD_DISCLAIMER } from './disclaimers';

interface LowImpactConfirmStepProps {
  /** Prefill: main flow already flagged a Rec & Parks location. */
  parksLocationFromMainFlow: boolean;
  /**
   * Prefill: "Night Shoot" was selected in the brief. It can't PROVE filming
   * past 10pm (so it never blocks detection) — instead the hours toggle starts
   * ON and the user flips it off if they wrap within standard hours.
   */
  nightShootFromMainFlow: boolean;
  /** Prefill for the on-set total: the brief's crew count (excludes cast). */
  crewSizeFromMainFlow: number;
  /** Previous answers when reopening to edit. */
  initial?: LowImpactConfirmInputs | null;
  onComplete: (answers: LowImpactConfirmInputs) => void;
  onCancel: () => void;
}

function schemaField(id: string) {
  const f = FORM_FIELDS.find((f) => f.id === id);
  if (!f) throw new Error(`Missing form field: ${id}`);
  return f;
}

export default function LowImpactConfirmStep({
  parksLocationFromMainFlow,
  nightShootFromMainFlow,
  crewSizeFromMainFlow,
  initial,
  onComplete,
  onCancel,
}: LowImpactConfirmStepProps) {
  const [firstFilmingDate, setFirstFilmingDate] = useState(initial?.firstFilmingDate ?? '');
  const [onSetCount, setOnSetCount] = useState<number>(initial?.onSetCount ?? crewSizeFromMainFlow);
  const [locationTypes, setLocationTypes] = useState<string[]>(
    initial?.locationTypes ?? (parksLocationFromMainFlow ? ['park'] : []),
  );
  const [isRecParkProperty, setIsRecParkProperty] = useState(
    initial?.isRecParkProperty ?? parksLocationFromMainFlow,
  );
  const [recParksActivities, setRecParksActivities] = useState<string[]>(initial?.recParksActivities ?? []);
  const [filmingOutsideBusinessHours, setFilmingOutsideBusinessHours] = useState(
    initial?.filmingOutsideBusinessHours ?? nightShootFromMainFlow,
  );
  const [additionalActivities, setAdditionalActivities] = useState<string[]>(
    initial?.additionalActivities ?? [],
  );

  const locationField = schemaField('locationTypes');
  const recParksField = schemaField('recParksActivities');

  // Same visibility rule as the schema: Rec & Parks question only makes sense
  // for park / city-building locations (or when the main flow already said parks).
  const showRecParkToggle =
    parksLocationFromMainFlow || locationTypes.includes('park') || locationTypes.includes('city_buildings');
  const showRecParksActivities = showRecParkToggle && isRecParkProperty;

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canSubmit = firstFilmingDate !== '' && onSetCount >= 1;

  const handleSubmit = () => {
    // Prune answers whose question was hidden — mirror of pruneHiddenFields.
    const recPark = showRecParkToggle ? isRecParkProperty : false;
    onComplete({
      firstFilmingDate,
      onSetCount,
      locationTypes,
      isRecParkProperty: recPark,
      recParksActivities: recPark ? recParksActivities : [],
      filmingOutsideBusinessHours,
      additionalActivities,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute inset-x-0 bottom-0 top-[60px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="max-w-[430px] mx-auto w-full h-full flex flex-col overflow-y-auto rounded-t-2xl"
          style={{ background: 'hsl(0, 0%, 100%)', borderTop: '3px solid hsl(213, 72%, 59%)' }}
        >
          <div className="px-6 pt-5 pb-8 space-y-5">
            <div>
              <h3 className="font-serif text-lg font-bold">Low Impact — confirm a few details</h3>
              <p className="text-xs text-gray-500 mt-1">{RESULT_CARD_DISCLAIMER}</p>
            </div>

            {/* First filming date */}
            <div className="space-y-1">
              <Label htmlFor="li-first-date" className="text-sm">First filming date</Label>
              <Input
                id="li-first-date"
                type="date"
                value={firstFilmingDate}
                onChange={(e) => setFirstFilmingDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Needed to check the 3-business-day notice and the pilot window.
              </p>
            </div>

            {/* On-set total — the brief's Crew count excludes cast */}
            <div className="space-y-1">
              <Label htmlFor="li-onset" className="text-sm">
                Total cast &amp; crew physically on set (busiest day)
              </Label>
              <Input
                id="li-onset"
                type="number"
                min={1}
                value={onSetCount}
                onChange={(e) => setOnSetCount(Math.max(0, Number(e.target.value)))}
              />
              <p className="text-xs text-gray-500">
                Pre-filled with your crew count — add cast, background, and everyone else on set.
                Low Impact allows 30 or fewer.
              </p>
            </div>

            {/* Hours */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm">
                Filming outside standard hours?
                <span className="block text-xs text-gray-500">7am–10pm weekdays, 9am–10pm weekends</span>
                {nightShootFromMainFlow && !initial && (
                  <span className="block text-xs text-gray-500">
                    Pre-set from your Night Shoot selection — turn off if you wrap by 10pm.
                  </span>
                )}
              </span>
              <Switch checked={filmingOutsideBusinessHours} onCheckedChange={setFilmingOutsideBusinessHours} />
            </label>

            {/* Location types */}
            <div className="space-y-1">
              <Label className="text-sm">{locationField.label}</Label>
              <p className="text-xs text-gray-500">{locationField.helpText}</p>
              <div className="grid gap-2 pl-1 pt-1">
                {locationField.options?.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`li-loc-${opt.value}`}
                      checked={locationTypes.includes(opt.value)}
                      onCheckedChange={() => toggle(locationTypes, setLocationTypes, opt.value)}
                    />
                    <Label htmlFor={`li-loc-${opt.value}`} className="text-sm font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Rec & Parks gate */}
            {showRecParkToggle && (
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm">
                  Is this Rec &amp; Parks property?
                  <span className="block text-xs text-gray-500">
                    Parks and other Rec &amp; Parks property have extra restrictions.
                  </span>
                </span>
                <Switch checked={isRecParkProperty} onCheckedChange={setIsRecParkProperty} />
              </label>
            )}

            {/* Rec & Parks-scoped activities */}
            {showRecParksActivities && (
              <div className="space-y-1">
                <Label className="text-sm">{recParksField.label}</Label>
                <p className="text-xs text-gray-500">{recParksField.helpText}</p>
                <div className="grid gap-2 pl-1 pt-1">
                  {recParksField.options?.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`li-rp-${opt.value}`}
                        checked={recParksActivities.includes(opt.value)}
                        onCheckedChange={() => toggle(recParksActivities, setRecParksActivities, opt.value)}
                      />
                      <Label htmlFor={`li-rp-${opt.value}`} className="text-sm font-normal">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional activity flags */}
            <div className="space-y-1">
              <Label className="text-sm">Will your shoot involve any of the following?</Label>
              <p className="text-xs text-gray-500">
                Select all that apply — these aren&apos;t covered by the Production Brief. Leave empty if none apply.
              </p>
              <div className="grid gap-2 pl-1 pt-1">
                {ADDITIONAL_ACTIVITY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`li-add-${opt.value}`}
                      checked={additionalActivities.includes(opt.value)}
                      onCheckedChange={() => toggle(additionalActivities, setAdditionalActivities, opt.value)}
                    />
                    <Label htmlFor={`li-add-${opt.value}`} className="text-sm font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={!canSubmit} onClick={handleSubmit}>
                Check eligibility
              </Button>
            </div>
            {!canSubmit && (
              <p className="text-xs text-gray-500 text-center">Enter your first filming date to check.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
