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
  onClearSearch?: () => void;
  neighborhood: string | null;
  specialCondition: SpecialConditionResult | null;
}

const TricolorSparkle = () =>
<span className="inline-flex gap-0.5 animate-sparkle-burst select-none" aria-hidden="true">
    <span className="text-secondary">✦</span>
    <span className="text-heading-blue">✧</span>
    <span className="text-card-red">✦</span>
  </span>;


const InfoCards = ({ location, jurisdiction, cdtfaName, matchStatus, confirmed, onConfirm, onClearSearch, neighborhood, specialCondition }: InfoCardsProps) => {
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
    <div className="flex flex-col gap-6 mx-4 mb-32">
      {/* Sparkle burst overlay */}
      {sparkleVisible &&
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-4xl animate-sparkle-burst">
            <TricolorSparkle />
          </div>
        </div>
      }

      {/* Mini-Kingdom Alert — no match */}
      {isUnmatched &&
      <div className="bg-card rounded-2xl shadow-md border border-border p-5 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="inline-block bg-card-red text-white font-sans text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Alert
            </span>
          </div>
          <h3 className="font-serif text-lg text-foreground mb-2">
            Uncharted Territory
          </h3>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {cdtfaName ?
          <>CDTFA says <span className="font-bold text-foreground">{cdtfaName}</span>, but we're still mapping this zone. Estimates may be rough.</> :

          <>Couldn't reach the jurisdiction API. Estimates may be rough.</>
          }
          </p>
        </div>
      }

      {/* Loading state */}
      {isLoading &&
      <div className="bg-card rounded-2xl shadow-md border border-border p-6 text-center">
          <p className="font-sans text-sm text-muted-foreground animate-pulse tracking-wide">
            Checking jurisdiction…
          </p>
        </div>
      }

      {/* Report Card — Mapping the Mini-Kingdoms */}
      <div className="relative">
        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          {/* Blue top accent border */}
          <div className="h-1 w-full bg-heading-blue" />
          
          <div className="p-5 relative">
            {/* Status badge — top right */}
            {isMatched &&
            <div className="absolute top-4 right-4">
                <span className="inline-block bg-secondary text-secondary-foreground font-sans text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  {hasPending ? "Match Found" : "Detected"}
                </span>
              </div>
            }

            <h3 className="font-serif text-foreground mb-3 pr-24 text-lg">Your LA Film Permit Assistant

            </h3>

            {!isMatched ?
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">Don't waste budget on non-refundable mistakes. We pinpoint jurisdictions, estimate fees, and track timelines across cities.

            </p> :

            <>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                  Located in{' '}
                  <span className="font-bold text-foreground">
                    {jurisdiction.jurisdiction}{neighborhood ? ` · ${neighborhood}` : ""}
                  </span>
                  . This city typically has a{' '}
                  <span className="font-bold text-foreground">{jurisdiction.deadlineTime}</span> cutoff.
                  Beat the clock.
                </p>
              </>
            }
          </div>
        </div>

        {/* Confirm button */}
        {hasPending &&
        <div className="flex flex-col items-center gap-3 mt-4">
            <button
            onClick={handleConfirmClick}
            className="w-full py-4 rounded-xl font-sans text-sm font-bold uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-lg bg-heading-blue text-white hover:opacity-90">

              <span className="flex items-center justify-center gap-2">
                Confirm This Location
                <span className="text-secondary">✦</span>
              </span>
            </button>
            <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              onClearSearch?.();
            }}
            className="font-sans text-xs text-muted-foreground underline underline-offset-4 cursor-pointer hover:text-foreground transition-colors">

              Not the right spot? Search again ↑
            </button>
          </div>
        }
      </div>

      {/* Production Brief Slide-Up */}
      {currentStep === 'brief' && confirmed && location && jurisdiction &&
      <ProductionBrief
        jurisdiction={jurisdiction}
        location={location}
        neighborhood={neighborhood}
        specialCondition={specialCondition}
        onBack={() => setCurrentStep('search')} />

      }

      {/* Sticky "Return to Brief" CTA */}
      {confirmed && currentStep === 'search' && jurisdiction &&
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-curioso-charcoal/95 backdrop-blur-sm border-t border-border/20 safe-area-bottom">
          <div className="max-w-[430px] mx-auto">
            <button
            onClick={() => setCurrentStep('brief')}
            className="w-full py-3.5 rounded-xl font-sans text-sm font-bold uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-lg bg-heading-blue text-white hover:opacity-90">

              📋 Return to Brief
            </button>
          </div>
        </div>
      }
    </div>);

};

export default InfoCards;