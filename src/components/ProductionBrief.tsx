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

const OUTSIDE_STUDIO_ZONE_CITIES = ["long beach", "pasadena", "santa clarita"];

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

type DossierTab = "logistics" | "rebate";

const ProductionBrief = ({ jurisdiction, location, neighborhood, onBack }: ProductionBriefProps) => {
  const [availableActivities, setAvailableActivities] = useState<ActivityRow[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [shootDays, setShootDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(12);
  const [loading, setLoading] = useState(true);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DossierTab>("logistics");

  // CA 4.0 Rebate toggles
  const [outsideStudioZone, setOutsideStudioZone] = useState(false);
  const [localResidentHiring, setLocalResidentHiring] = useState(false);
  const [careerPathways, setCareerPathways] = useState(false);

  // Auto-detect Outside Studio Zone
  useEffect(() => {
    const city = jurisdiction.jurisdiction?.toLowerCase() ?? "";
    if (OUTSIDE_STUDIO_ZONE_CITIES.some((c) => city.includes(c))) {
      setOutsideStudioZone(true);
    }
  }, [jurisdiction.jurisdiction]);

  // CA 4.0 2026 Rebate math
  const qualifiedSpend = 150_000;
  const baseRebatePct = 35;
  const combinedPct =
    baseRebatePct +
    (outsideStudioZone ? 5 : 0) +
    (localResidentHiring ? 10 : 0) +
    (careerPathways ? 2 : 0);
  const totalRebate = qualifiedSpend * (combinedPct / 100);

  useEffect(() => {
    console.log(`[Rebate] ${combinedPct}% of $${qualifiedSpend.toLocaleString()} = $${totalRebate.toLocaleString()}`);
  }, [combinedPct, totalRebate]);

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

  const netCost = estimatedTotal - totalRebate;
  const isFullyOffset = netCost <= 0;

  const tabs: { key: DossierTab; label: string; icon: string }[] = [
    { key: "logistics", label: "Project Logistics", icon: "📋" },
    { key: "rebate", label: "Rebate Optimizer", icon: "💰" },
  ];

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

        {/* ─── Manila Folder Tabs ─── */}
        <div
          className="shrink-0 max-w-[430px] mx-auto w-full flex"
          style={{
            borderLeft: "2.5px solid hsl(0, 0%, 5%)",
            borderRight: "2.5px solid hsl(0, 0%, 5%)",
            background: DOSSIER_BG,
            backgroundImage: PAPER_BG,
          }}
        >
          {tabs.map((tab, i) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 cursor-pointer transition-all relative group ${!isActive ? 'hover:brightness-95' : ''}`}
                style={{
                  minHeight: "44px",
                  padding: "10px 8px 8px",
                  background: isActive ? "hsl(220, 100%, 33%)" : DOSSIER_BG,
                  borderLeft: i === 0 ? "none" : "1px solid hsl(0, 0%, 85%)",
                  borderRight: i === tabs.length - 1 ? "none" : "1px solid hsl(0, 0%, 85%)",
                  borderTop: "none",
                  borderBottom: isActive ? "none" : "1px solid hsl(0, 0%, 85%)",
                  borderRadius: "0",
                  filter: "url(#wobbly)",
                  boxShadow: isActive ? `0 2px 0 ${DOSSIER_BG}` : "none",
                  zIndex: isActive ? 2 : 1,
                }}
              >
                <span className="text-sm mr-1">{tab.icon}</span>
                <span
                  className={`font-headline uppercase ${!isActive ? 'group-hover:opacity-80' : ''}`}
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.15em",
                    color: isActive ? "#FFFFFF" : "hsl(0, 0%, 25%)",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── Scrollable Tab Content ─── */}
        <div
          className="flex-1 overflow-y-auto max-w-[430px] mx-auto w-full px-5"
          style={{
            borderLeft: "2.5px solid hsl(0, 0%, 5%)",
            borderRight: "2.5px solid hsl(0, 0%, 5%)",
            background: DOSSIER_BG,
            backgroundImage: PAPER_BG,
          }}
        >
          {/* ═══ TAB A: Project Logistics ═══ */}
          {activeTab === "logistics" && (
            <div className="animate-tab-flip" key="logistics">
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
            </div>
          )}

          {/* ═══ TAB B: Rebate Optimizer ═══ */}
          {activeTab === "rebate" && (
            <div className="animate-tab-flip" key="rebate">
              <div className="pt-4 pb-2">
                <h3 className="font-headline text-xs text-heading-blue uppercase tracking-[0.25em] mb-1">
                  California 4.0 Tax Credit Rebate
                </h3>

                {/* Effective Rate Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                    2026 Indie/Middle Tier
                  </span>
                  <span className="px-2 py-0.5 rounded font-headline text-xs" style={{ background: "hsla(120, 30%, 40%, 0.12)", color: "#2D5A27", border: "1px solid hsla(120, 30%, 40%, 0.25)", fontSize: "11px", letterSpacing: "0.05em" }}>
                    Effective Rate: {combinedPct}%
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { id: "outside-zone", label: "Outside Studio Zone", pct: "+5%", icon: "📍", checked: outsideStudioZone, onChange: setOutsideStudioZone },
                    { id: "local-resident", label: "Local Resident Hiring", pct: "+10%", icon: "🏘️", checked: localResidentHiring, onChange: setLocalResidentHiring },
                    { id: "career-pathways", label: "Career Pathways Trainee", pct: "+2%", icon: "🎓", checked: careerPathways, onChange: setCareerPathways },
                  ].map((item) => (
                    <label key={item.id} htmlFor={item.id} className="flex items-center gap-3 px-3 cursor-pointer" style={{ minHeight: "44px", border: item.checked ? "1.5px solid hsl(220, 100%, 33%)" : "1px solid hsl(0, 0%, 90%)", borderRadius: "6px", background: item.checked ? "hsla(220, 100%, 33%, 0.04)" : "transparent", transition: "all 0.2s ease" }}>
                      <span className="text-base leading-none">{item.icon}</span>
                      <span className="font-handwritten flex-1" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em", color: item.checked ? "hsl(220, 100%, 33%)" : "hsl(0, 0%, 5%)" }}>{item.label}</span>
                      <span className="font-headline text-[10px] mr-1" style={{ color: item.checked ? "#2D5A27" : "hsl(0, 0%, 60%)", fontWeight: 700, transition: "color 0.2s ease" }}>{item.pct}</span>
                      <Switch id={item.id} checked={item.checked} onCheckedChange={item.onChange} />
                    </label>
                  ))}
                </div>

                {/* Rate Breakdown */}
                <div className="mt-4 px-3 py-2.5" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "11px", border: "1px dashed hsl(0, 0%, 80%)", borderRadius: "6px", background: "hsla(0, 0%, 0%, 0.02)" }}>
                  <div className="flex items-baseline gap-1.5 text-foreground">
                    <span>{baseRebatePct}%</span>
                    <span className="text-muted-foreground text-[9px]">(base)</span>
                    {outsideStudioZone && <span style={{ color: "#2D5A27" }}>+ 5%</span>}
                    {localResidentHiring && <span style={{ color: "#2D5A27" }}>+ 10%</span>}
                    {careerPathways && <span style={{ color: "#2D5A27" }}>+ 2%</span>}
                    <span className="text-foreground font-bold ml-auto">= {combinedPct}% of ${qualifiedSpend.toLocaleString()}</span>
                  </div>
                </div>

                {/* Green Stamp — compact */}
                <div className="mt-4 flex justify-center">
                  <div className="px-4 py-2.5 text-center" style={{ border: "2px double #2D5A27", borderRadius: "10px", transform: "rotate(-1.5deg)", background: "hsla(120, 30%, 95%, 0.35)", maxWidth: "200px", width: "100%", opacity: 0.7 }}>
                    <span className="font-headline text-[7px] uppercase tracking-[0.25em] block" style={{ color: "#2D5A27" }}>★ CA 4.0 Tax Credit ★</span>
                    <span className="font-headline text-lg block mt-0.5" style={{ color: "#2D5A27" }}>${totalRebate.toLocaleString()}</span>
                    <span className="font-headline text-[7px] uppercase tracking-[0.15em] block mt-0.5" style={{ color: "#2D5A27", opacity: 0.5 }}>{combinedPct}% of ${qualifiedSpend.toLocaleString()}</span>
                  </div>
                </div>

                {/* Explanatory text */}
                <p className="text-muted-foreground mt-3 px-1" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "9px", lineHeight: 1.5, opacity: 0.7 }}>
                  This credit is calculated based on qualified expenditures and applicable uplifts. Toggle options above to see how different incentives affect your rebate.
                </p>

                {/* Disclaimer */}
                <div className="flex items-start gap-1.5 mt-2 px-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center justify-center shrink-0 cursor-help font-headline text-[9px] rounded-full" style={{ width: "14px", height: "14px", border: "1px solid hsl(0, 0%, 70%)", color: "hsl(0, 0%, 50%)", marginTop: "1px" }}>i</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[260px]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
                      Rebate is an estimate based on CA 4.0 State Guidelines for qualified local expenditures. Actual amounts may vary.
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-muted-foreground" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "8px", lineHeight: 1.4, opacity: 0.7 }}>
                    Estimate per CA 4.0 2026 Guidelines. Subject to CFC approval.
                  </p>
                </div>
              </div>
              <div className="h-6" />
            </div>
          )}

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

                    {/* Divider */}
                    <div style={{ borderTop: "1.5px dashed hsl(0, 0%, 80%)", margin: "8px 0" }} />

                    {/* Subtotal */}
                    <div className="flex justify-between items-baseline font-bold">
                      <span>TOTAL PERMIT FEES</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-foreground/30" style={{ marginBottom: "3px" }} />
                      <span>${estimatedTotal.toLocaleString()}</span>
                    </div>

                    {/* Rebate line */}
                    <div className="flex justify-between items-baseline" style={{ color: "#2D5A27" }}>
                      <span>CA 4.0 REBATE ({combinedPct}%)</span>
                      <span className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: "#2D5A27", opacity: 0.3, marginBottom: "3px" }} />
                      <span className="font-bold whitespace-nowrap">− ${totalRebate.toLocaleString()}</span>
                    </div>

                    {/* Thick divider */}
                    <div style={{ borderTop: "2.5px solid hsl(0, 0%, 5%)", margin: "8px 0" }} />

                    {/* Net cost summary */}
                    <div className="flex justify-between items-baseline text-sm">
                      <span className="font-bold">{isFullyOffset ? "NET PROFIT" : "NET COST"}</span>
                      <span className="flex-1 mx-2" />
                      <span className="font-bold" style={{ color: isFullyOffset ? "#2D5A27" : "hsl(7, 80%, 56%)" }}>
                        {isFullyOffset
                          ? `+$${Math.abs(netCost).toLocaleString()}`
                          : `$${netCost.toLocaleString()}`}
                      </span>
                    </div>
                    {isFullyOffset && (
                      <p className="font-handwritten text-xs text-center mt-1" style={{ color: "#2D5A27" }}>
                        Permit fees fully offset by rebate ✓
                      </p>
                    )}

                    {anyNeedsQuote && (
                      <p className="font-handwritten text-xs italic mt-2" style={{ color: "hsl(7, 80%, 56%)" }}>* Some fees unavailable — consult City Hall for a full quote.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Pinned Bottom: Clean Ledger-Style Summary ─── */}
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
            {/* Net Profit / Net Cost — dominant */}
            <div className="flex justify-between items-baseline">
              <span className="font-headline uppercase tracking-[0.1em]" style={{ fontSize: "12px", color: isFullyOffset ? "hsl(120, 40%, 30%)" : "hsl(7, 80%, 56%)" }}>
                {isFullyOffset ? "Net Profit" : "Net Cost"}
              </span>
              <span className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: isFullyOffset ? "hsl(120, 40%, 30%)" : "hsl(7, 80%, 56%)", opacity: 0.3, marginBottom: "4px" }} />
              <span style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "20px", fontWeight: 800, color: isFullyOffset ? "hsl(120, 40%, 30%)" : "hsl(7, 80%, 56%)" }}>
                {isFullyOffset
                  ? `+$${Math.abs(netCost).toLocaleString()}`
                  : `$${netCost.toLocaleString()}`}
              </span>
            </div>
            {/* Est. Total — secondary */}
            <div className="flex justify-between items-baseline mt-1" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
              <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(0, 0%, 55%)" }}>Est. Total</span>
              <span className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 75%)", marginBottom: "2px" }} />
              <span style={{ fontSize: "12px", color: "hsl(0, 0%, 50%)" }}>${estimatedTotal.toLocaleString()}</span>
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
