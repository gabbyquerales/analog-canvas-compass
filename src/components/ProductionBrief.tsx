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

const PAPER_BG = "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")";
const DOSSIER_BG = "#FFFFFF";

const ProductionBrief = ({ jurisdiction, location, neighborhood, onBack }: ProductionBriefProps) => {
  const [availableActivities, setAvailableActivities] = useState<ActivityRow[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [shootDays, setShootDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(12);
  const [loading, setLoading] = useState(true);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);

  // Fetch activities
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
      const total =
        (fee * shootDays) +
        ((Math.max(4, hoursPerDay) + 1) * staffingRate * shootDays);
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
        style={{ background: DOSSIER_BG }}
      >
        {/* ─── Pinned Header ─── */}
        <div
          className="shrink-0 max-w-[430px] mx-auto w-full px-5 pt-5 pb-3"
          style={{
            borderLeft: "2.5px solid hsl(0, 0%, 5%)",
            borderRight: "2.5px solid hsl(0, 0%, 5%)",
            borderTop: "2.5px solid hsl(0, 0%, 5%)",
            background: DOSSIER_BG,
            backgroundImage: PAPER_BG,
          }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <button
              onClick={onBack}
              className="font-handwritten text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <div className="text-right">
              <h2 className="font-headline text-base text-foreground uppercase tracking-tight leading-tight">
                Production Brief
              </h2>
              <p className="font-handwritten text-sm text-heading-blue">
                {jurisdiction.jurisdiction}
                {neighborhood ? ` — ${neighborhood}` : ""}
              </p>
              {jurisdiction.regionalProfile && (
                <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                  {jurisdiction.regionalProfile}
                </p>
              )}
            </div>
          </div>
          <svg className="w-full" height="2" viewBox="0 0 380 2" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2 1C120 0.5 260 1.5 378 1" stroke="hsl(0, 0%, 5%)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        {/* ─── Scrollable Content ─── */}
        <div
          className="flex-1 overflow-y-auto max-w-[430px] mx-auto w-full px-5"
          style={{
            borderLeft: "2.5px solid hsl(0, 0%, 5%)",
            borderRight: "2.5px solid hsl(0, 0%, 5%)",
            background: DOSSIER_BG,
            backgroundImage: PAPER_BG,
          }}
        >
          {/* Shoot Parameters */}
          <div className="mb-6 pb-5 pt-4">
            <h3 className="font-headline text-xs text-heading-blue uppercase tracking-[0.25em] mb-3">
              Shoot Parameters
            </h3>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShootDays(Math.max(1, shootDays - 1))} className="cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center rounded-md select-none" style={{ width: "36px", height: "36px", border: "1px solid #D1D5DB", background: "#FFFFFF", fontSize: "18px", color: "#111827", fontFamily: "system-ui, sans-serif", lineHeight: 1 }}>&minus;</button>
                <input type="number" min={1} max={90} value={shootDays} onChange={(e) => setShootDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))} className="bg-transparent outline-none text-center" style={{ width: "40px", height: "36px", fontSize: "20px", fontWeight: 600, color: "#000000", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", MozAppearance: "textfield", WebkitAppearance: "none" as any }} />
                <button onClick={() => setShootDays(Math.min(90, shootDays + 1))} className="cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center rounded-md" style={{ width: "36px", height: "36px", border: "1px solid #D1D5DB", background: "#FFFFFF", fontSize: "18px", color: "#111827", fontFamily: "system-ui, sans-serif" }}>+</button>
                <span style={{ fontSize: "13px", color: "#4B5563", fontWeight: 500, fontFamily: "system-ui, sans-serif" }}>days</span>
              </div>
              <span className="text-sm text-muted-foreground" style={{ fontFamily: "system-ui, sans-serif" }}>×</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setHoursPerDay(Math.max(1, hoursPerDay - 1))} className="cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center rounded-md select-none" style={{ width: "36px", height: "36px", border: "1px solid #D1D5DB", background: "#FFFFFF", fontSize: "18px", color: "#111827", fontFamily: "system-ui, sans-serif", lineHeight: 1 }}>&minus;</button>
                <input type="number" min={1} max={24} value={hoursPerDay} onChange={(e) => setHoursPerDay(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))} className="bg-transparent outline-none text-center" style={{ width: "40px", height: "36px", fontSize: "20px", fontWeight: 600, color: "#000000", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", MozAppearance: "textfield", WebkitAppearance: "none" as any }} />
                <button onClick={() => setHoursPerDay(Math.min(24, hoursPerDay + 1))} className="cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center rounded-md" style={{ width: "36px", height: "36px", border: "1px solid #D1D5DB", background: "#FFFFFF", fontSize: "18px", color: "#111827", fontFamily: "system-ui, sans-serif" }}>+</button>
                <span style={{ fontSize: "13px", color: "#4B5563", fontWeight: 500, fontFamily: "system-ui, sans-serif" }}>hrs/day</span>
              </div>
            </div>
          </div>

          {/* Special Activities */}
          <div className="mb-6">
            <h3 className="font-headline text-xs text-heading-blue uppercase tracking-[0.25em] mb-3">Special Activities</h3>
            {loading ? (
              <p className="font-handwritten text-sm text-muted-foreground animate-pulse text-center py-4">Loading activities…</p>
            ) : (
              <div className="space-y-2">
                {availableActivities.map((activity) => {
                  const isActive = selectedActivities.has(activity.id);
                  const icon = ACTIVITY_ICONS[activity.slug ?? ""] ?? "📋";
                  return (
                    <label key={activity.id} className="flex items-center gap-3 px-3 cursor-pointer" style={{ minHeight: "44px", border: isActive ? "1.5px solid hsl(220, 100%, 33%)" : "1px solid hsl(0, 0%, 90%)", borderRadius: "6px", background: isActive ? "hsla(220, 100%, 33%, 0.04)" : "transparent" }}>
                      <span className="text-base leading-none">{icon}</span>
                      <span className="font-handwritten flex-1" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em", color: "hsl(0, 0%, 5%)" }}>{activity.activity_name}</span>
                      <span style={{ fontSize: "10px", color: "hsl(0, 0%, 55%)", fontFamily: "'Courier New', Courier, monospace", whiteSpace: "nowrap", fontWeight: 500 }}>+${calcActivityTotal(activity).total.toLocaleString()}</span>
                      <Switch checked={isActive} onCheckedChange={() => toggleActivity(activity.id)} />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="h-6" />

          {/* Bottom spacer for pinned bar */}
          <div className="h-24" />
        </div>

        {/* ─── Full-Screen Ledger Drawer ─── */}
        {ledgerExpanded && (
          <div className="fixed inset-0 z-[65] flex flex-col" onClick={() => setLedgerExpanded(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 animate-fade-in" />

            {/* Full-screen sheet sliding up */}
            <div
              className="absolute inset-x-0 bottom-0 animate-slide-up-full"
              style={{ top: "60px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="max-w-[430px] mx-auto w-full h-full flex flex-col overflow-y-auto"
                style={{
                  background: DOSSIER_BG,
                  backgroundImage: PAPER_BG,
                  borderTop: "2.5px solid hsl(0, 0%, 5%)",
                  borderLeft: "2.5px solid hsl(0, 0%, 5%)",
                  borderRight: "2.5px solid hsl(0, 0%, 5%)",
                  borderRadius: "12px 12px 0 0",
                  filter: "url(#wobbly)",
                }}
              >
                {/* Drawer handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "hsl(0, 0%, 75%)" }} />
                </div>

                <div className="px-5 pt-2 pb-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-headline text-xs text-heading-blue uppercase tracking-[0.25em]">Financial Ledger</h3>
                    <button onClick={() => setLedgerExpanded(false)} className="font-headline text-xs cursor-pointer hover:opacity-70 transition-opacity" style={{ color: "hsl(0, 0%, 40%)", minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕ Close</button>
                  </div>

                  {/* Ledger lines */}
                  <div className="text-xs text-foreground space-y-2.5" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                    <div className="flex justify-between items-baseline">
                      <span>BASE PERMIT FEE</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-foreground/30" style={{ marginBottom: "3px" }} />
                      {baseFeeNeedsQuote ? (
                        <span className="font-handwritten text-xs italic whitespace-nowrap" style={{ color: "hsl(7, 80%, 56%)" }}>Consult City Hall</span>
                      ) : (
                        <span className="font-bold">${baseFee.toLocaleString()}</span>
                      )}
                    </div>

                    {selectedList.map((activity) => {
                      const { total, needsQuote } = calcActivityTotal(activity);
                      const hasStaffing = activity.requires_staffing;
                      return (
                        <div key={activity.id} className="flex justify-between items-baseline">
                          <span className="truncate max-w-[55%] flex items-center gap-1">
                            {activity.activity_name.toUpperCase()}
                            {hasStaffing && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild><span className="cursor-help text-xs" style={{ color: "hsl(7, 80%, 56%)" }}>👮</span></TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[260px]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>MANDATORY PERSONNEL: Rates from 2026 {jurisdiction.jurisdiction} Fee Schedule.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild><span className="cursor-help text-xs">📝</span></TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[280px]" style={{ background: "hsl(50, 100%, 80%)", color: "hsl(0, 0%, 10%)", border: "1px solid hsl(45, 60%, 60%)", fontFamily: "system-ui, -apple-system, sans-serif" }}>4-hour minimum + 1 hr travel baked in.</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </span>
                          <span className="flex-1 mx-2 border-b border-dotted border-foreground/30" style={{ marginBottom: "3px" }} />
                          {needsQuote ? (
                            <span className="font-handwritten text-xs italic whitespace-nowrap" style={{ color: "hsl(7, 80%, 56%)" }}>Consult City Hall</span>
                          ) : (
                            <span className="font-bold whitespace-nowrap">+ ${total.toLocaleString()}</span>
                          )}
                        </div>
                      );
                    })}

                    {selectedList.length === 0 && (
                      <div className="flex justify-between items-baseline text-muted-foreground">
                        <span>ACTIVITY ADD-ONS</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-foreground/30" style={{ marginBottom: "3px" }} />
                        <span>+ $0</span>
                      </div>
                    )}

                    {/* Thick divider */}
                    <div style={{ borderTop: "2.5px solid hsl(0, 0%, 5%)", margin: "8px 0" }} />

                    {/* Total */}
                    <div className="flex justify-between items-baseline text-sm">
                      <span className="font-bold">TOTAL PERMIT COSTS</span>
                      <span className="flex-1 mx-2" />
                      <span className="font-bold">${estimatedTotal.toLocaleString()}</span>
                    </div>

                    {anyNeedsQuote && (
                      <p className="font-handwritten text-xs italic mt-2" style={{ color: "hsl(7, 80%, 56%)" }}>* Some fees unavailable — consult City Hall for a full quote.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Pinned Bottom: Permit Cost Summary ─── */}
        <div className="shrink-0 max-w-[430px] mx-auto w-full z-[60]">
          <button
            onClick={() => setLedgerExpanded(!ledgerExpanded)}
            className="w-full cursor-pointer transition-opacity hover:opacity-95 px-5 py-3"
            style={{
              background: "hsl(40, 30%, 93%)",
              backgroundImage: PAPER_BG,
              borderTop: "none",
              borderLeft: "2.5px solid hsl(0, 0%, 5%)",
              borderRight: "2.5px solid hsl(0, 0%, 5%)",
              borderBottom: "2.5px solid hsl(0, 0%, 5%)",
              boxShadow: "0 -6px 16px -4px hsla(0, 0%, 0%, 0.12)",
            }}
          >
            {/* Total Permit Costs — dominant */}
            <div className="flex justify-between items-baseline">
              <span className="font-headline uppercase tracking-[0.1em]" style={{ fontSize: "12px", color: "hsl(0, 0%, 5%)" }}>
                Est. Permit Costs
              </span>
              <span className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 5%)", opacity: 0.3, marginBottom: "4px" }} />
              <span style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "20px", fontWeight: 800, color: "hsl(0, 0%, 5%)" }}>
                ${estimatedTotal.toLocaleString()}
              </span>
            </div>
            {/* Link-style CTA */}
            <p className="text-center mt-2">
              <span className="font-handwritten underline" style={{ fontSize: "11px", color: "hsl(220, 100%, 33%)", textUnderlineOffset: "2px" }}>
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
