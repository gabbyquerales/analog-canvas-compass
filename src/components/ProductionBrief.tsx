import { useState, useEffect, useMemo, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { type JurisdictionResult, type SpecialConditionResult } from "@/lib/jurisdiction";
import type { LocationResult } from "@/components/MapEngine";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductionBriefProps {
  jurisdiction: JurisdictionResult;
  location: LocationResult;
  neighborhood: string | null;
  specialCondition: SpecialConditionResult | null;
  onBack: () => void;
}

interface ActivityRow {
  id: string;
  activity_name: string;
  additional_fee: number;
  staffing_hourly_est: number | null;
  requires_staffing: boolean;
  is_per_day: boolean;
  requires_personnel: string | null;
  description: string | null;
  slug?: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  street_closure: "🚧",
  gunfire_sfx: "💥",
  drone_aerial: "🛸",
  night_shoot: "🌙",
  pyrotechnics: "🔥",
  water_effects: "💧",
  animals: "🐎",
  stunts: "🤸",
};

const ProductionBrief = ({ jurisdiction, location, neighborhood, onBack }: ProductionBriefProps) => {
  const [availableActivities, setAvailableActivities] = useState<ActivityRow[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [shootDays, setShootDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(12);
  const [loading, setLoading] = useState(true);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("additional_fees")
        .select("*")
        .eq("jurisdiction_id", jurisdiction.jurisdictionId);

      if (!error && data) {
        setAvailableActivities(
          (data as any[]).map((r) => ({
            ...r,
            additional_fee: r.additional_fee ?? 0,
            staffing_hourly_est: r.staffing_hourly_est ?? null,
            requires_staffing: r.requires_staffing ?? false,
            is_per_day: r.is_per_day ?? true,
          }))
        );
      }
      setLoading(false);
    };
    fetchActivities();
  }, [jurisdiction.jurisdictionId]);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const safeFee = (val: number | null | undefined) => (val != null && isFinite(val) ? val : null);

  const calcActivityTotal = useCallback((activity: ActivityRow) => {
    if (activity.requires_staffing) {
      const fee = activity.additional_fee ?? 0;
      const staffingRate = activity.staffing_hourly_est ?? jurisdiction.defaultStaffingRate ?? 125;
      const total = (fee * shootDays) + ((Math.max(4, hoursPerDay) + 1) * staffingRate * shootDays);
      return { total, needsQuote: false };
    } else {
      const fee = activity.additional_fee ?? 0;
      const total = fee * (activity.is_per_day ? shootDays : 1);
      return { total, needsQuote: false };
    }
  }, [shootDays, hoursPerDay, jurisdiction.defaultStaffingRate]);

  const { baseFee, baseFeeNeedsQuote, selectedList, addOnTotal, estimatedTotal, anyNeedsQuote } = useMemo(() => {
    const baseFeeRaw = safeFee(jurisdiction.estimatedFee);
    const baseFee = baseFeeRaw ?? 0;
    const baseFeeNeedsQuote = baseFeeRaw === null;
    const selectedList = availableActivities.filter((a) => selectedActivities.has(a.id));
    const addOnTotal = selectedList.reduce((sum, a) => sum + calcActivityTotal(a).total, 0);
    const estimatedTotal = baseFee + addOnTotal;
    const anyNeedsQuote = baseFeeNeedsQuote || selectedList.some((a) => calcActivityTotal(a).needsQuote);
    return { baseFee, baseFeeNeedsQuote, selectedList, addOnTotal, estimatedTotal, anyNeedsQuote };
  }, [availableActivities, selectedActivities, shootDays, hoursPerDay, jurisdiction, calcActivityTotal]);

  return (
    <TooltipProvider>
      <div
        className="fixed inset-0 z-40 flex flex-col animate-slide-up-full"
        style={{ background: "hsl(60, 11%, 97%)" }}
      >
        {/* ─── Header ─── */}
        <div className="shrink-0 max-w-[430px] mx-auto w-full px-5 pt-5 pb-4" style={{ background: "hsl(0, 0%, 100%)" }}>
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={onBack}
              className="cursor-pointer transition-colors flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, color: "hsl(213, 72%, 59%)" }}
            >
              ← Back
            </button>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "hsl(0, 0%, 55%)",
              }}
            >
              Curioso Labs
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "22px",
              fontWeight: 800,
              color: "hsl(0, 0%, 10%)",
              lineHeight: 1.2,
              marginBottom: "4px",
            }}
          >
            Production Brief
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "hsl(213, 72%, 59%)", fontWeight: 500 }}>
            {jurisdiction.jurisdiction}
            {neighborhood ? ` — ${neighborhood}` : ""}
          </p>
          {jurisdiction.regionalProfile && (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "hsl(0, 0%, 55%)", marginTop: "2px" }}>
              {jurisdiction.regionalProfile}
            </p>
          )}
          {/* Blue accent line */}
          <div style={{ height: "2px", background: "hsl(213, 72%, 59%)", borderRadius: "1px", marginTop: "12px" }} />
        </div>

        {/* ─── Scrollable Content ─── */}
        <div className="flex-1 overflow-y-auto max-w-[430px] mx-auto w-full px-4 pt-4 pb-48" style={{ background: "hsl(60, 11%, 97%)" }}>
          {/* Shoot Parameters Card */}
          <div
            style={{
              background: "hsl(0, 0%, 100%)",
              borderRadius: "12px",
              borderTop: "2px solid hsl(213, 72%, 59%)",
              boxShadow: "0 1px 4px hsla(0, 0%, 0%, 0.06), 0 4px 12px hsla(0, 0%, 0%, 0.04)",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.15em",
                color: "hsl(213, 72%, 59%)",
                marginBottom: "16px",
              }}
            >
              Shoot Parameters
            </h3>

            {/* Days stepper */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShootDays(Math.max(1, shootDays - 1))}
                  className="cursor-pointer select-none flex items-center justify-center transition-all active:scale-95"
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "hsl(48, 100%, 50%)",
                    border: "none",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "hsl(0, 0%, 10%)",
                    boxShadow: "0 2px 8px hsla(48, 100%, 50%, 0.35)",
                  }}
                >
                  −
                </button>
                <div className="text-center" style={{ minWidth: "64px" }}>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={shootDays}
                    onChange={(e) => setShootDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                    className="bg-transparent outline-none text-center"
                    style={{
                      width: "50px",
                      fontSize: "32px",
                      fontWeight: 800,
                      color: "hsl(0, 0%, 10%)",
                      fontFamily: "var(--font-serif)",
                      MozAppearance: "textfield",
                      WebkitAppearance: "none" as any,
                    }}
                  />
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, color: "hsl(0, 0%, 50%)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                    Days
                  </p>
                </div>
                <button
                  onClick={() => setShootDays(Math.min(90, shootDays + 1))}
                  className="cursor-pointer select-none flex items-center justify-center transition-all active:scale-95"
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "hsl(48, 100%, 50%)",
                    border: "none",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "hsl(0, 0%, 10%)",
                    boxShadow: "0 2px 8px hsla(48, 100%, 50%, 0.35)",
                  }}
                >
                  +
                </button>
              </div>

              <span style={{ fontFamily: "var(--font-sans)", fontSize: "18px", color: "hsl(0, 0%, 70%)", fontWeight: 300 }}>×</span>

              {/* Hours stepper */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setHoursPerDay(Math.max(1, hoursPerDay - 1))}
                  className="cursor-pointer select-none flex items-center justify-center transition-all active:scale-95"
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "hsl(48, 100%, 50%)",
                    border: "none",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "hsl(0, 0%, 10%)",
                    boxShadow: "0 2px 8px hsla(48, 100%, 50%, 0.35)",
                  }}
                >
                  −
                </button>
                <div className="text-center" style={{ minWidth: "64px" }}>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                    className="bg-transparent outline-none text-center"
                    style={{
                      width: "50px",
                      fontSize: "32px",
                      fontWeight: 800,
                      color: "hsl(0, 0%, 10%)",
                      fontFamily: "var(--font-serif)",
                      MozAppearance: "textfield",
                      WebkitAppearance: "none" as any,
                    }}
                  />
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, color: "hsl(0, 0%, 50%)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                    Hrs / Day
                  </p>
                </div>
                <button
                  onClick={() => setHoursPerDay(Math.min(24, hoursPerDay + 1))}
                  className="cursor-pointer select-none flex items-center justify-center transition-all active:scale-95"
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "hsl(48, 100%, 50%)",
                    border: "none",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "hsl(0, 0%, 10%)",
                    boxShadow: "0 2px 8px hsla(48, 100%, 50%, 0.35)",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Special Activities Card */}
          <div
            style={{
              background: "hsl(0, 0%, 100%)",
              borderRadius: "12px",
              borderTop: "2px solid hsl(213, 72%, 59%)",
              boxShadow: "0 1px 4px hsla(0, 0%, 0%, 0.06), 0 4px 12px hsla(0, 0%, 0%, 0.04)",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.15em",
                color: "hsl(213, 72%, 59%)",
                marginBottom: "16px",
              }}
            >
              Special Activities
            </h3>
            {loading ? (
              <p className="animate-pulse text-center py-4" style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "hsl(0, 0%, 55%)" }}>
                Loading activities…
              </p>
            ) : (
              <div className="space-y-2.5">
                {availableActivities.map((activity) => {
                  const isActive = selectedActivities.has(activity.id);
                  const icon = ACTIVITY_ICONS[activity.slug ?? ""] ?? "📋";
                  return (
                    <label
                      key={activity.id}
                      className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
                      style={{
                        minHeight: "52px",
                        borderRadius: "10px",
                        border: isActive ? "1.5px solid hsl(48, 100%, 50%)" : "1px solid hsl(0, 0%, 90%)",
                        background: isActive ? "hsla(48, 100%, 50%, 0.05)" : "hsl(0, 0%, 100%)",
                      }}
                    >
                      <span className="text-lg leading-none">{icon}</span>
                      <span
                        className="flex-1"
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "hsl(0, 0%, 15%)",
                        }}
                      >
                        {activity.activity_name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "hsl(0, 0%, 45%)",
                          whiteSpace: "nowrap",
                          textAlign: "right" as const,
                          minWidth: "70px",
                        }}
                      >
                        +${calcActivityTotal(activity).total.toLocaleString()}
                      </span>
                      <Switch checked={isActive} onCheckedChange={() => toggleActivity(activity.id)} />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Full-Screen Ledger Drawer ─── */}
        {ledgerExpanded && (
          <div className="fixed inset-0 z-[65] flex flex-col" onClick={() => setLedgerExpanded(false)}>
            <div className="absolute inset-0 bg-black/40 animate-fade-in" />
            <div
              className="absolute inset-x-0 bottom-0 animate-slide-up-full"
              style={{ top: "80px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="max-w-[430px] mx-auto w-full h-full flex flex-col overflow-y-auto"
                style={{
                  background: "hsl(0, 0%, 100%)",
                  borderTop: "3px solid hsl(213, 72%, 59%)",
                  borderRadius: "16px 16px 0 0",
                  boxShadow: "0 -8px 32px hsla(0, 0%, 0%, 0.15)",
                }}
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "hsl(0, 0%, 82%)" }} />
                </div>

                <div className="px-6 pt-3 pb-8 flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "18px",
                        fontWeight: 800,
                        color: "hsl(0, 0%, 10%)",
                      }}
                    >
                      Financial Ledger
                    </h3>
                    <button
                      onClick={() => setLedgerExpanded(false)}
                      className="cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center"
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "hsl(0, 0%, 45%)",
                        minHeight: "44px",
                        minWidth: "44px",
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="space-y-3" style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "hsl(0, 0%, 15%)" }}>
                    <div className="flex justify-between items-baseline">
                      <span style={{ fontWeight: 500 }}>Base Permit Fee</span>
                      <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 85%)", marginBottom: "3px" }} />
                      {baseFeeNeedsQuote ? (
                        <span style={{ fontSize: "12px", fontStyle: "italic", color: "hsl(4, 78%, 56%)" }}>Consult City Hall</span>
                      ) : (
                        <span style={{ fontWeight: 700 }}>${baseFee.toLocaleString()}</span>
                      )}
                    </div>

                    {selectedList.map((activity) => {
                      const { total, needsQuote } = calcActivityTotal(activity);
                      const hasStaffing = activity.requires_staffing;
                      return (
                        <div key={activity.id} className="flex justify-between items-baseline">
                          <span className="truncate max-w-[55%] flex items-center gap-1" style={{ fontWeight: 500 }}>
                            {activity.activity_name}
                            {hasStaffing && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild><span className="cursor-help text-xs" style={{ color: "hsl(4, 78%, 56%)" }}>👮</span></TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[260px]" style={{ fontFamily: "var(--font-sans)" }}>MANDATORY PERSONNEL: Rates from 2026 {jurisdiction.jurisdiction} Fee Schedule.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild><span className="cursor-help text-xs">📝</span></TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[280px]" style={{ background: "hsl(50, 100%, 80%)", color: "hsl(0, 0%, 10%)", border: "1px solid hsl(45, 60%, 60%)", fontFamily: "var(--font-sans)" }}>4-hour minimum + 1 hr travel baked in.</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </span>
                          <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 85%)", marginBottom: "3px" }} />
                          {needsQuote ? (
                            <span style={{ fontSize: "12px", fontStyle: "italic", color: "hsl(4, 78%, 56%)" }}>Consult City Hall</span>
                          ) : (
                            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>+ ${total.toLocaleString()}</span>
                          )}
                        </div>
                      );
                    })}

                    {selectedList.length === 0 && (
                      <div className="flex justify-between items-baseline" style={{ color: "hsl(0, 0%, 55%)" }}>
                        <span>Activity Add-ons</span>
                        <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 85%)", marginBottom: "3px" }} />
                        <span>+ $0</span>
                      </div>
                    )}

                    <div style={{ borderTop: "2px solid hsl(0, 0%, 10%)", margin: "12px 0" }} />

                    <div className="flex justify-between items-baseline" style={{ fontSize: "15px" }}>
                      <span style={{ fontWeight: 800 }}>Total Permit Costs</span>
                      <span className="flex-1 mx-3" />
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-serif)", fontSize: "18px" }}>${estimatedTotal.toLocaleString()}</span>
                    </div>

                    {anyNeedsQuote && (
                      <p style={{ fontSize: "11px", fontStyle: "italic", color: "hsl(4, 78%, 56%)", marginTop: "8px" }}>* Some fees unavailable — consult City Hall for a full quote.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Sticky Footer Ledger ─── */}
        <div className="shrink-0 max-w-[430px] mx-auto w-full z-[60]">
          <button
            onClick={() => setLedgerExpanded(!ledgerExpanded)}
            className="w-full cursor-pointer transition-opacity hover:opacity-95 px-6 py-4"
            style={{
              background: "hsl(0, 0%, 15%)",
              borderRadius: "16px 16px 0 0",
              boxShadow: "0 -8px 24px hsla(0, 0%, 0%, 0.18)",
            }}
          >
            <div className="flex justify-between items-baseline">
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.12em",
                  color: "hsl(0, 0%, 100%)",
                }}
              >
                Est. Permit Costs
              </span>
              <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsla(0, 0%, 100%, 0.2)", marginBottom: "4px" }} />
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "hsl(48, 100%, 50%)",
                }}
              >
                ${estimatedTotal.toLocaleString()}
              </span>
            </div>
            <p className="text-center mt-2">
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "hsl(213, 72%, 59%)",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                View full ledger
              </span>
            </p>
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProductionBrief;
