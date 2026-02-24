// CDTFA Tax Rate API — extracts jurisdiction name from California tax data

const PREFIXES_TO_REMOVE = ["CITY OF ", "TOWN OF ", "VILLAGE OF ", "COUNTY OF "];

const ALIAS_MAP: Record<string, string> = {
  "BEVERLY HILLS": "BEVERLY HILLS",
};

/** Clean and normalize a raw CDTFA jurisdiction string */
export function normalizeJurisdiction(raw: string): string {
  let cleaned = raw.trim().toUpperCase();

  // County Pocket Logic: any mention of "UNINCORPORATED" → LOS ANGELES COUNTY
  if (cleaned.includes("UNINCORPORATED")) {
    return "LOS ANGELES COUNTY";
  }

  for (const prefix of PREFIXES_TO_REMOVE) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }
  cleaned = cleaned.trim();
  return ALIAS_MAP[cleaned] ?? cleaned;
}

export interface CdtfaResult {
  jurisdiction: string;
  raw: any;
}

export async function fetchCdtfaJurisdiction(
  lng: number,
  lat: number
): Promise<CdtfaResult | null> {
  try {
    const supabaseUrl = "https://ehxaweuopfqcxubryiju.supabase.co";
    const res = await fetch(
      `${supabaseUrl}/functions/v1/cdtfa-proxy?lng=${lng}&lat=${lat}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    // The API returns taxRateInfo array — extract the city/county name
    const info = data?.taxRateInfo?.[0];
    const jurisdiction =
      info?.city ||
      info?.county ||
      data?.TaxRateInfo?.City ||
      data?.TaxRateInfo?.County ||
      "";

    if (!jurisdiction) return null;

    return {
      jurisdiction: normalizeJurisdiction(jurisdiction),
      raw: data,
    };
  } catch {
    return null;
  }
}
