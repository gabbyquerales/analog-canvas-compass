import { type JurisdictionResult, type SpecialConditionResult } from "@/lib/jurisdiction";
import type { LocationResult, MatchStatus } from "@/components/MapEngine";
import { toast } from "sonner";
import { useState } from "react";
import ProductionBrief from "@/components/ProductionBrief";

type Step = 'search' | 'brief' | 'timeline';

interface InfoCardsProps {
  location: LocationResult | null;
  jurisdiction: JurisdictionResult | null;
  cdtfaName: string | null;
  matchStatus: MatchStatus;
  confirmed: boolean;
  onConfirm: () => void;
  neighborhood: string | null;
  specialCondition: SpecialConditionResult | null;
}

const TricolorSparkle = () => (
  <span className="inline-flex gap-0.5 animate-sparkle-burst select-none" aria-hidden="true">
    <span style={{ color: 'hsl(48, 100%, 50%)' }}>✦</span>
    <span style={{ color: 'hsl(220, 100%, 33%)' }}>✧</span>
    <span style={{ color: 'hsl(7, 80%, 56%)' }}>✦</span>
  </span>
);

const InfoCards = ({ location, jurisdiction, cdtfaName, matchStatus, confirmed, onConfirm, neighborhood, specialCondition }: InfoCardsProps) => {
  const [sparkleVisible, setSparkleVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('search');

  // Reset step when location changes (new search)
  const locationKey = location?.placeName ?? null;
  const [prevLocationKey, setPrevLocationKey] = useState<string | null>(null);
  if (locationKey !== prevLocationKey) {
    setPrevLocationKey(locationKey);
    if (currentStep !== 'search') {
      setCurrentStep('search');
    }
    if (sparkleVisible) {
      setSparkleVisible(false);
    }
  }

  const isMatched = matchStatus === "matched" && !!jurisdiction;
  const isUnmatched = matchStatus === "unmatched";
  const isLoading = matchStatus === "loading";
  const hasPending = isMatched && !confirmed;

  const handleConfirmClick = () => {
    setSparkleVisible(true);
    setCurrentStep('brief');
    onConfirm();
    setTimeout(() => setSparkleVisible(false), 1200);
  };

  const handleDraftNote = () => {
    const address = location?.placeName ?? "[Address]";
    const fee = jurisdiction?.estimatedFee ?? "[Fee]";
    const note = `Hey! I'm testing a tool called Kairo. It estimates that a permit at ${address} is $${fee} vs $0 in Atlanta. Just wanted to share what the "Peach vs. Palm Tree" gap looks like for indie creators!`;
    navigator.clipboard.writeText(note);
    toast.success("Note copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-8 mx-8 mt-10 mb-10">
      {/* Sparkle burst overlay */}
      {sparkleVisible && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-4xl animate-sparkle-burst">
            <TricolorSparkle />
          </div>
        </div>
      )}

      {/* Mini-Kingdom Alert — no match in local data */}
      {isUnmatched && (
        <div
          className="wobbly-border p-6 relative overflow-hidden"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, hsla(48, 100%, 50%, 0.10) 0%, transparent 80%)`,
          }}
        >
          <div className="tape-note mb-3">
            <span className="font-handwritten text-sm text-secondary-foreground">
              mini-kingdom alert
            </span>
          </div>
          <h3 className="font-headline text-lg text-foreground uppercase tracking-tight mb-2">
            Uncharted Territory
          </h3>
          <p className="font-handwritten text-base text-muted-foreground leading-relaxed">
            {cdtfaName ? (
              <>CDTFA says <span className="font-headline text-foreground">{cdtfaName}</span>, but we're still mapping this specific area. Calculations might be rough!</>
            ) : (
              <>We couldn't reach the jurisdiction API for this spot. Calculations might be rough!</>
            )}
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="wobbly-border p-6 text-center">
          <p className="font-handwritten text-base text-muted-foreground animate-pulse">
            Checking jurisdiction…
          </p>
        </div>
      )}

      {/* Card 1 — Yellow: Mapping the Mini-Kingdoms + Confirm button taped to bottom */}
      <div className="relative">
        <div
          className="wobbly-border p-6 relative overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 20% 30%, hsla(48, 100%, 50%, 0.12) 0%, transparent 70%),
              radial-gradient(ellipse at 80% 70%, hsla(48, 100%, 50%, 0.08) 0%, transparent 60%),
              radial-gradient(ellipse at 50% 50%, hsla(48, 100%, 50%, 0.05) 0%, transparent 80%)
            `,
          }}
        >
          <h3 className="font-headline text-xl text-foreground uppercase tracking-tight mb-5">
            Mapping the Mini-Kingdoms
          </h3>
          {!isMatched ? (
            <p className="font-handwritten text-base text-muted-foreground leading-relaxed">
              LA is a jigsaw of 88 cities. We're trying to map the maze so your production doesn't get lost at the border.
            </p>
          ) : (
            <>
              <div className="tape-note mb-3">
                <span className="font-handwritten text-sm text-secondary-foreground">
                  {hasPending ? "potential match found" : "detected"}
                </span>
              </div>
              <p className="font-handwritten text-base text-muted-foreground leading-relaxed">
                Looks like <span className="font-headline text-foreground">
                  {jurisdiction.jurisdiction}{neighborhood ? ` (${neighborhood})` : ""}
                </span>: Based on our map, this city usually has a{' '}
                <span className="font-headline text-foreground">{jurisdiction.deadlineTime}</span> cutoff. Let's aim to beat that clock just in case!
              </p>
            </>
          )}
        </div>

        {/* Confirm button — taped to the bottom of the Yellow card */}
        {hasPending && (
          <div className="flex flex-col items-center gap-3 -mt-4 relative z-10">
            <button
              onClick={handleConfirmClick}
              className="tape-note px-10 py-4 font-headline text-base text-foreground uppercase tracking-wide cursor-pointer hover:scale-105 transition-transform active:scale-95 relative overflow-hidden animate-pulse-subtle"
              style={{ transform: 'rotate(-1deg)', boxShadow: '0 0 16px hsla(7, 80%, 56%, 0.4)', background: 'hsl(7, 80%, 56%)', color: 'white', borderColor: 'hsl(7, 70%, 46%)' }}
            >
              <span className="relative z-10 flex items-center gap-2">
                👉 Confirm This Location
                <span style={{ color: 'hsl(48, 100%, 50%)' }}>✦</span>
              </span>
              {sparkleVisible && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="animate-sparkle-pop flex gap-1 text-2xl">
                    <span style={{ color: 'hsl(48, 100%, 50%)' }}>✦</span>
                    <span style={{ color: 'hsl(220, 100%, 33%)' }}>✧</span>
                    <span style={{ color: 'hsl(7, 80%, 56%)' }}>✦</span>
                  </span>
                </span>
              )}
            </button>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                toast("Try searching for a different address above!", { icon: "🔍" });
              }}
              className="font-handwritten text-sm text-muted-foreground underline underline-offset-4 cursor-pointer hover:text-foreground transition-colors"
              style={{ transform: 'rotate(0.5deg)' }}
            >
              Not the right spot? Search again ↑
            </button>
          </div>
        )}

        {/* Return to Brief button — shown after confirmation while on map */}
        {confirmed && currentStep === 'search' && jurisdiction && (
          <div className="flex justify-center -mt-4 relative z-10">
            <button
              onClick={() => setCurrentStep('brief')}
              className="tape-note px-8 py-3 font-headline text-sm uppercase tracking-wide cursor-pointer hover:scale-105 transition-transform active:scale-95"
              style={{ transform: 'rotate(-0.5deg)', background: 'hsl(220, 100%, 33%)', color: 'white', borderColor: 'hsl(220, 80%, 25%)' }}
            >
              📋 Return to Brief
            </button>
          </div>
        )}
      </div>

      {/* Production Brief Slide-Up */}
      {currentStep === 'brief' && confirmed && location && jurisdiction && (
        <ProductionBrief
          jurisdiction={jurisdiction}
          location={location}
          neighborhood={neighborhood}
          specialCondition={specialCondition}
          onBack={() => setCurrentStep('search')}
        />
      )}
    </div>
  );
};

export default InfoCards;
