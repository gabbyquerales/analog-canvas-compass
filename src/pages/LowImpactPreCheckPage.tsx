import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { evaluate } from '@/features/low-impact-precheck/evaluate';
import { rankSuggestions } from '@/features/low-impact-precheck/suggest';
import { FORM_FIELDS } from '@/features/low-impact-precheck/formSchema';
import { RESULT_COPY } from '@/features/low-impact-precheck/copy';
import { RESULT_CARD_DISCLAIMER, FOOTER_DISCLAIMER } from '@/features/low-impact-precheck/disclaimers';
import type { ShootInput, EvaluationResult } from '@/features/low-impact-precheck/types';
import type { Suggestion } from '@/features/low-impact-precheck/types';

function isFieldVisible(fieldId: string, formData: Record<string, any>): boolean {
  const field = FORM_FIELDS.find((f) => f.id === fieldId);
  if (!field?.visibleWhen) return true;
  const { fieldId: depId, equals, includes } = field.visibleWhen;
  const depValue = formData[depId];
  if (equals !== undefined) return depValue === equals;
  if (includes !== undefined && Array.isArray(depValue)) return depValue.includes(includes);
  return true;
}

const today = new Date().toISOString().split('T')[0];

function buildInitialFormData(): Record<string, any> {
  const data: Record<string, any> = {};
  for (const field of FORM_FIELDS) {
    switch (field.type) {
      case 'boolean':
        data[field.id] = false;
        break;
      case 'number':
        data[field.id] = 0;
        break;
      case 'date':
        data[field.id] = field.id === 'submissionDate' ? today : '';
        break;
      case 'multiselect':
        data[field.id] = [];
        break;
      case 'text':
      case 'select':
      default:
        data[field.id] = '';
        break;
    }
  }
  return data;
}

function formDataToShootInput(data: Record<string, any>): ShootInput {
  return {
    projectName: data.projectName || '',
    jurisdiction: data.jurisdiction || undefined,
    firstFilmingDate: data.firstFilmingDate || '',
    submissionDate: data.submissionDate || today,
    locationCount: Number(data.locationCount) || 0,
    consecutiveFilmingDays: Number(data.consecutiveFilmingDays) || 0,
    isConsecutiveDays: data.isConsecutiveDays === 'true' ? true : data.isConsecutiveDays === 'false' ? false : undefined,
    onSetCount: Number(data.onSetCount) || 0,
    hasSpecialEffects: !!data.hasSpecialEffects,
    hasGunfire: !!data.hasGunfire,
    hasOfficerImpersonation: !!data.hasOfficerImpersonation,
    hasLaneClosures: !!data.hasLaneClosures,
    hasTrafficControl: !!data.hasTrafficControl,
    hasDrivingShots: !!data.hasDrivingShots,
    hasAerialActivity: !!data.hasAerialActivity,
    hasAnimalActivity: !!data.hasAnimalActivity,
    hasAmplifiedMusic: !!data.hasAmplifiedMusic,
    hasLargeLighting: !!data.hasLargeLighting,
    hasLargeLightingAssessment: data.hasLargeLightingAssessment || undefined,
    hasGenerators: !!data.hasGenerators,
    hasOpenFlames: !!data.hasOpenFlames,
    hasPropaneHeaters: !!data.hasPropaneHeaters,
    hasSmokeMachines: !!data.hasSmokeMachines,
    hasAlarmBypass: !!data.hasAlarmBypass,
    hasSmoking: !!data.hasSmoking,
    hasPracticalStove: !!data.hasPracticalStove,
    hasGrillingFoodPrep: !!data.hasGrillingFoodPrep,
    hasStunts: !!data.hasStunts,
    hasLandscapeAlteration: !!data.hasLandscapeAlteration,
    hasSignRemoval: !!data.hasSignRemoval,
    hasDiggingDrilling: !!data.hasDiggingDrilling,
    hasNailingBolting: !!data.hasNailingBolting,
    hasHeavyEquipmentOnGrass: !!data.hasHeavyEquipmentOnGrass,
    hasCranes: !!data.hasCranes,
    locationTypes: data.locationTypes || [],
    isRecParkProperty: !!data.isRecParkProperty,
    filmingOutsideBusinessHours: !!data.filmingOutsideBusinessHours,
  };
}

const STATE_COLORS: Record<string, string> = {
  qualifies: 'bg-blue-100 border-blue-400 text-blue-900',
  needsReview: 'bg-yellow-100 border-yellow-400 text-yellow-900',
  doesNotQualify: 'bg-red-100 border-red-400 text-red-900',
  notApplicable: 'bg-gray-100 border-gray-400 text-gray-700',
};

const STATE_BADGES: Record<string, string> = {
  qualifies: 'Likely Qualifies',
  needsReview: 'Needs Review',
  doesNotQualify: 'Likely Does Not Qualify',
  notApplicable: 'Not Applicable',
};

export default function LowImpactPreCheckPage() {
  const [formData, setFormData] = useState<Record<string, any>>(buildInitialFormData);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const updateField = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMultiselect = (fieldId: string, optionValue: string) => {
    setFormData((prev) => {
      const current: string[] = prev[fieldId] || [];
      const next = current.includes(optionValue)
        ? current.filter((v: string) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [fieldId]: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = formDataToShootInput(formData);
    const evalResult = evaluate(input);
    const ranked = rankSuggestions(
      evalResult.blockers.map((b) => b.id),
      evalResult.reviewTriggers.map((r) => r.id),
    );
    setResult(evalResult);
    setSuggestions(ranked);
  };

  // Group fields by section
  const sections = FORM_FIELDS.reduce<Record<string, typeof FORM_FIELDS>>((acc, field) => {
    const section = field.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Low Impact Permit Pre-Check</h1>
      <p className="text-sm text-gray-500 mb-6">{RESULT_CARD_DISCLAIMER}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {Object.entries(sections).map(([sectionName, fields]) => (
          <Card key={sectionName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{sectionName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field) => {
                if (!isFieldVisible(field.id, formData)) return null;

                return (
                  <div key={field.id} className="space-y-1">
                    {field.type === 'boolean' ? (
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor={field.id} className="text-sm font-normal leading-snug">
                          {field.label}
                        </Label>
                        <Switch
                          id={field.id}
                          checked={!!formData[field.id]}
                          onCheckedChange={(checked) => updateField(field.id, checked)}
                        />
                      </div>
                    ) : field.type === 'select' ? (
                      <>
                        <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                        <Select
                          value={formData[field.id] || ''}
                          onValueChange={(val) => updateField(field.id, val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : field.type === 'multiselect' ? (
                      <>
                        <Label className="text-sm">{field.label}</Label>
                        <div className="grid gap-2 pl-1">
                          {field.options?.map((opt) => (
                            <div key={opt.value} className="flex items-center gap-2">
                              <Checkbox
                                id={`${field.id}-${opt.value}`}
                                checked={(formData[field.id] || []).includes(opt.value)}
                                onCheckedChange={() => toggleMultiselect(field.id, opt.value)}
                              />
                              <Label
                                htmlFor={`${field.id}-${opt.value}`}
                                className="text-sm font-normal"
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : field.type === 'number' ? (
                      <>
                        <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                        <Input
                          id={field.id}
                          type="number"
                          min={0}
                          value={formData[field.id] ?? ''}
                          onChange={(e) => updateField(field.id, Number(e.target.value))}
                        />
                      </>
                    ) : field.type === 'date' ? (
                      <>
                        <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                        <Input
                          id={field.id}
                          type="date"
                          value={formData[field.id] || ''}
                          onChange={(e) => updateField(field.id, e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                        <Input
                          id={field.id}
                          type="text"
                          value={formData[field.id] || ''}
                          onChange={(e) => updateField(field.id, e.target.value)}
                        />
                      </>
                    )}
                    {field.helpText && (
                      <p className="text-xs text-gray-500">{field.helpText}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <Button type="submit" className="w-full">
          Check Eligibility
        </Button>
      </form>

      {result && (
        <div className="mt-8 space-y-4">
          {/* Verdict */}
          <Card className={`border-2 ${STATE_COLORS[result.state]}`}>
            <CardContent className="pt-6">
              <Badge variant="outline" className="mb-3">
                {STATE_BADGES[result.state]}
              </Badge>

              {result.state === 'notApplicable' ? (
                <div>
                  <h2 className="text-xl font-bold mb-2">Not Applicable</h2>
                  <p className="text-sm">
                    This pilot is City-of-Los-Angeles only. Other jurisdictions use Standard
                    permits — see{' '}
                    <a
                      href="https://www.filmla.com/permitting/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      filmla.com/permitting
                    </a>{' '}
                    for details.
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold mb-2">
                    {RESULT_COPY[result.state]?.headline}
                  </h2>
                  <p className="text-sm font-medium mb-2">
                    {RESULT_COPY[result.state]?.subhead}
                  </p>
                  <p className="text-sm">
                    {RESULT_COPY[result.state]?.bodyParagraph}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blockers */}
          {result.blockers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Blockers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.blockers.map((b) => (
                    <li key={b.id} className="text-sm flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">✕</span>
                      <span>{b.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Review triggers */}
          {result.reviewTriggers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Needs FilmLA Review</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.reviewTriggers.map((r) => (
                    <li key={r.id} className="text-sm flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">?</span>
                      <div>
                        <span>{r.label}</span>
                        {r.helpText && (
                          <p className="text-xs text-gray-500 mt-0.5">{r.helpText}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {result.state !== 'notApplicable' && suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestions.map((s) => (
                  <div key={s.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        Tier {s.tier}
                      </Badge>
                      <span className="text-sm font-medium">{s.headline}</span>
                    </div>
                    <p className="text-sm text-gray-600">{s.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Fee math */}
          {result.state !== 'notApplicable' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Fee Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Fee</th>
                      <th className="text-right py-1">Standard</th>
                      <th className="text-right py-1">Low Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-1">Application</td>
                      <td className="text-right">${result.feeMath.standardTierEstimate > 0 ? 931 : 0}</td>
                      <td className="text-right">${result.feeMath.applicationFee}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1">Notification</td>
                      <td className="text-right">
                        ${result.state === 'doesNotQualify'
                          ? result.feeMath.notificationPerLocation
                          : Math.round(result.feeMath.standardTierEstimate - 931 - 287)}
                      </td>
                      <td className="text-right">${result.feeMath.notificationPerLocation}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1">LAFD Spot Check</td>
                      <td className="text-right">$287</td>
                      <td className="text-right">${result.feeMath.lafdSpotCheck === 0 ? 'Waived' : `$${result.feeMath.lafdSpotCheck}`}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-1">Total</td>
                      <td className="text-right">${result.feeMath.standardTierEstimate}</td>
                      <td className="text-right">${result.feeMath.estimatedTotal}</td>
                    </tr>
                  </tbody>
                </table>
                {result.feeMath.savingsPercent > 0 && (
                  <p className="mt-2 text-sm font-medium text-blue-700">
                    Estimated savings: ~{result.feeMath.savingsPercent}%
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="mt-8 pb-6 border-t pt-4">
        <p className="text-xs text-gray-500">{FOOTER_DISCLAIMER}</p>
      </div>
    </div>
  );
}
