import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { fetchCdtfaJurisdiction } from "@/lib/cdtfa";
import { performRelationalLookup, type JurisdictionResult, type SpecialConditionResult } from "@/lib/jurisdiction";
import { Search, Loader2, X } from "lucide-react";
import * as turf from "@turf/turf";

mapboxgl.accessToken = MAPBOX_TOKEN;

export interface LocationResult {
  lng: number;
  lat: number;
  placeName: string;
}

export type MatchStatus = "idle" | "loading" | "matched" | "unmatched";

export interface MapSelectionResult {
  location: LocationResult;
  jurisdiction: JurisdictionResult | null;
  cdtfaName: string | null;
  matchStatus: MatchStatus;
  neighborhood: string | null;
  specialCondition: SpecialConditionResult | null;
}

const LA_BBOX: [number, number, number, number] = [-118.9448, 32.7500, -117.6462, 34.8233];
const LA_CENTER = { lng: -118.2437, lat: 34.0522 };
const FEET_TO_METERS = 0.3048;
const RADIUS_FEET = 500;
const RADIUS_METERS = RADIUS_FEET * FEET_TO_METERS;

// Local landmark aliases that Mapbox may not index well
const LA_LANDMARKS: { keywords: string[]; feature: any }[] = [
  {
    keywords: ["hollywood sign", "the hollywood sign"],
    feature: {
      id: "local-hollywood-sign",
      place_name: "Hollywood Sign, Los Angeles, California, United States",
      text: "Hollywood Sign",
      center: [-118.3215, 34.1341],
      place_type: ["poi"],
      relevance: 1,
    },
  },
  {
    keywords: ["pink palace", "the pink palace", "beverly hills hotel"],
    feature: {
      id: "local-beverly-hills-hotel",
      place_name: "The Beverly Hills Hotel, Beverly Hills, California, United States",
      text: "The Beverly Hills Hotel",
      center: [-118.4137, 34.0818],
      place_type: ["poi"],
      relevance: 1,
    },
  },
  {
    keywords: ["griffith observatory", "griffith"],
    feature: {
      id: "local-griffith-observatory",
      place_name: "Griffith Observatory, Los Angeles, California, United States",
      text: "Griffith Observatory",
      center: [-118.3004, 34.1185],
      place_type: ["poi"],
      relevance: 1,
    },
  },
  {
    keywords: ["santa monica pier", "the pier"],
    feature: {
      id: "local-santa-monica-pier",
      place_name: "Santa Monica Pier, Santa Monica, California, United States",
      text: "Santa Monica Pier",
      center: [-118.4983, 34.0083],
      place_type: ["poi"],
      relevance: 1,
    },
  },
];

function isInsideBbox(lng: number, lat: number): boolean {
  return lng >= LA_BBOX[0] && lng <= LA_BBOX[2] && lat >= LA_BBOX[1] && lat <= LA_BBOX[3];
}

interface MapEngineProps {
  onSelectionChange: (result: MapSelectionResult) => void;
  clearSearchRef?: React.MutableRefObject<(() => void) | null>;
}

const MapEngine = ({ onSelectionChange, clearSearchRef }: MapEngineProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [targetAcquired, setTargetAcquired] = useState(false);
  const [outsideMessage, setOutsideMessage] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingFlyTo = useRef<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-118.2437, 34.0522],
      zoom: 10,
      attributionControl: false,
    });
    map.current.on("load", () => {
      setMapLoaded(true);
      if (pendingFlyTo.current) {
        const { lng, lat } = pendingFlyTo.current;
        map.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 1500 });
        pendingFlyTo.current = null;
      }
    });
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Expose clear function to parent
  useEffect(() => {
    if (clearSearchRef) {
      clearSearchRef.current = () => {
        setQuery("");
        setSuggestions([]);
        setNoResults(false);
        setOutsideMessage(false);
        setTargetAcquired(false);
        setLoading(false);
        if (marker.current) { marker.current.remove(); marker.current = null; }
        if (map.current) {
          if (map.current.getLayer("radius-circle-fill")) map.current.removeLayer("radius-circle-fill");
          if (map.current.getLayer("radius-circle-stroke")) map.current.removeLayer("radius-circle-stroke");
          if (map.current.getSource("radius-circle")) map.current.removeSource("radius-circle");
          map.current.flyTo({ center: [LA_CENTER.lng, LA_CENTER.lat], zoom: 10, duration: 1200 });
        }
        onSelectionChange({
          location: { lng: LA_CENTER.lng, lat: LA_CENTER.lat, placeName: "" },
          jurisdiction: null,
          cdtfaName: null,
          matchStatus: "idle",
          neighborhood: null,
          specialCondition: null,
        });
      };
    }
  }, [clearSearchRef, onSelectionChange]);

  const searchAddress = useCallback(async (text: string) => {
    if (text.length < 2) { setSuggestions([]); setNoResults(false); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&proximity=${LA_CENTER.lng},${LA_CENTER.lat}&bbox=${LA_BBOX.join(",")}&limit=8&types=poi,address,neighborhood,place,locality&autocomplete=true&fuzzyMatch=true`
      );
      const data = await res.json();
      let features = data.features || [];
      const q = text.toLowerCase().trim();

      // Inject local landmark matches that Mapbox may miss
      for (const landmark of LA_LANDMARKS) {
        if (landmark.keywords.some(kw => kw.includes(q) || q.includes(kw))) {
          const alreadyPresent = features.some((f: any) => f.id === landmark.feature.id);
          if (!alreadyPresent) {
            features.unshift(landmark.feature);
          }
        }
      }

      // Re-rank: boost results whose name closely matches the query string
      features.sort((a: any, b: any) => {
        const aName = (a.text || "").toLowerCase();
        const bName = (b.text || "").toLowerCase();
        const aStarts = aName.startsWith(q) ? 0 : 1;
        const bStarts = bName.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        const aIncludes = aName.includes(q) ? 0 : 1;
        const bIncludes = bName.includes(q) ? 0 : 1;
        if (aIncludes !== bIncludes) return aIncludes - bIncludes;
        return (b.relevance ?? 0) - (a.relevance ?? 0);
      });
      features = features.slice(0, 5);
      setSuggestions(features);
      setNoResults(features.length === 0 && text.length >= 3);
    } catch { setSuggestions([]); setNoResults(false); }
  }, [mapLoaded]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setHighlightedIndex(-1);
    setOutsideMessage(false);
    setNoResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(value), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      selectPlace(suggestions[idx]);
    }
  };

  const selectPlace = async (feature: any) => {
    const [lng, lat] = feature.center;
    const placeName = feature.place_name;

    // Check if inside LA County bbox
    if (!isInsideBbox(lng, lat)) {
      setOutsideMessage(true);
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setOutsideMessage(false);

    setQuery(placeName);
    setSuggestions([]);
    setLoading(true);
    setTargetAcquired(false);
    setHighlightedIndex(-1);
    // Notify parent of loading state
    onSelectionChange({
      location: { lng, lat, placeName },
      jurisdiction: null,
      cdtfaName: null,
      matchStatus: "loading",
      neighborhood: null,
      specialCondition: null,
    });

    // Fly to location and place marker
    if (mapLoaded && map.current) {
      map.current.flyTo({ center: [lng, lat], zoom: 15, duration: 1500 });
    } else {
      pendingFlyTo.current = { lng, lat };
    }
    if (marker.current) marker.current.remove();
    marker.current = new mapboxgl.Marker({ color: "#005A9C" })
      .setLngLat([lng, lat])
      .addTo(map.current!);
    drawRadiusCircle(lng, lat);
    setTargetAcquired(true);

    // Call CDTFA API
    const cdtfaResult = await fetchCdtfaJurisdiction(lng, lat);
    const cdtfaName = cdtfaResult?.jurisdiction ?? null;

    // Multi-threaded relational lookup
    let jurisdiction: JurisdictionResult | null = null;
    let neighborhood: string | null = null;
    let specialCondition: SpecialConditionResult | null = null;

    if (cdtfaName) {
      const lookup = await performRelationalLookup(cdtfaName, feature);
      jurisdiction = lookup.jurisdiction;
      neighborhood = lookup.neighborhood;
      specialCondition = lookup.specialCondition;
    }

    setLoading(false);

    onSelectionChange({
      location: { lng, lat, placeName },
      jurisdiction,
      cdtfaName,
      matchStatus: jurisdiction ? "matched" : "unmatched",
      neighborhood,
      specialCondition,
    });
  };

  const drawRadiusCircle = (lng: number, lat: number) => {
    if (!map.current || !mapLoaded) return;
    const circle = turf.circle([lng, lat], RADIUS_METERS / 1000, { steps: 64, units: "kilometers" });
    if (map.current.getSource("radius-circle")) {
      (map.current.getSource("radius-circle") as mapboxgl.GeoJSONSource).setData(circle);
    } else {
      map.current.addSource("radius-circle", { type: "geojson", data: circle });
      map.current.addLayer({
        id: "radius-circle-fill", type: "fill", source: "radius-circle",
        paint: { "fill-color": "#FFCC00", "fill-opacity": 0.15 },
      });
      map.current.addLayer({
        id: "radius-circle-stroke", type: "line", source: "radius-circle",
        paint: { "line-color": "#000000", "line-width": 2, "line-dasharray": [4, 3] },
      });
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center mx-6 py-12 wobbly-border bg-background">
        <span className="font-handwritten text-2xl text-destructive mb-2">Mapbox Token Missing!</span>
        <span className="font-handwritten text-sm text-muted-foreground">Good grief... check your environment variables.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="px-6 mb-4 relative z-20">
        <div className="flex items-center px-4 py-3 bg-background rounded-xl border-2 border-border shadow-sm transition-all focus-within:border-heading-blue focus-within:shadow-md">
          {loading ? (
            <Loader2 size={18} className="text-secondary mr-3 flex-shrink-0 animate-spin" />
          ) : (
            <Search size={18} className="text-secondary mr-3 flex-shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { setQuery(""); setSuggestions([]); }}
            onKeyDown={handleKeyDown}
            placeholder="Enter a landmark (e.g., Hollywood Sign)..."
            className="bg-transparent w-full font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setNoResults(false);
                setOutsideMessage(false);
                setTargetAcquired(false);
                setLoading(false);
                if (marker.current) { marker.current.remove(); marker.current = null; }
                if (map.current) {
                  if (map.current.getLayer("radius-circle-fill")) map.current.removeLayer("radius-circle-fill");
                  if (map.current.getLayer("radius-circle-stroke")) map.current.removeLayer("radius-circle-stroke");
                  if (map.current.getSource("radius-circle")) map.current.removeSource("radius-circle");
                  map.current.flyTo({ center: [LA_CENTER.lng, LA_CENTER.lat], zoom: 10, duration: 1200 });
                }
                onSelectionChange({
                  location: { lng: LA_CENTER.lng, lat: LA_CENTER.lat, placeName: "" },
                  jurisdiction: null,
                  cdtfaName: null,
                  matchStatus: "idle",
                  neighborhood: null,
                  specialCondition: null,
                });
              }}
              className="ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute left-6 right-6 mt-1 bg-background rounded-xl border-2 border-border max-h-[200px] overflow-y-auto z-30 shadow-lg">
            {suggestions.map((s: any, index: number) => (
              <button
                key={s.id}
                onClick={() => selectPlace(s)}
                className={`w-full text-left px-4 py-3 font-sans text-sm text-foreground hover:bg-muted transition-colors border-b border-border/50 last:border-b-0 ${index === highlightedIndex ? "bg-muted" : ""}`}
              >
                {s.place_name}
              </button>
            ))}
          </div>
        )}
        {outsideMessage && (
          <div className="absolute left-6 right-6 mt-1 bg-background wobbly-border px-4 py-3">
            <p className="font-handwritten text-sm text-muted-foreground leading-relaxed" style={{ transform: 'rotate(-0.5deg)' }}>
              Kairo is currently focused on the 88 Kingdoms of LA. We haven't traveled that far yet! <span style={{ color: 'hsl(48, 100%, 50%)' }}>✦</span>
            </p>
          </div>
        )}
        {noResults && !outsideMessage && (
          <div className="absolute left-6 right-6 mt-1 bg-background wobbly-border px-4 py-3">
            <p className="font-handwritten text-sm text-muted-foreground leading-relaxed" style={{ transform: 'rotate(0.5deg)' }}>
              The maze is tricky! Try a nearby cross-street? <span style={{ color: 'hsl(48, 100%, 50%)' }}>✦</span>
            </p>
          </div>
        )}
      </div>
      <div className="mx-6 overflow-hidden relative rounded-2xl border-2 border-border shadow-lg" style={{ height: "40vh", minHeight: "220px" }}>
        <div ref={mapContainer} className="w-full h-full" />
        {targetAcquired && (
          <span className="absolute bottom-2 right-3 font-sans text-[10px] font-medium tracking-widest uppercase text-foreground/50 pointer-events-none select-none">
            Target Acquired ✦
          </span>
        )}
      </div>
    </div>
  );
};

export default MapEngine;
