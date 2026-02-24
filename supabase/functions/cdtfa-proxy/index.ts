import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const lng = url.searchParams.get("lng");
  const lat = url.searchParams.get("lat");

  if (!lng || !lat) {
    return new Response(JSON.stringify({ error: "lng and lat required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const cdtfaUrl = `https://services.maps.cdtfa.ca.gov/api/taxrate/GetRateByLngLat?Longitude=${lng}&Latitude=${lat}`;
    const res = await fetch(cdtfaUrl);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch from CDTFA" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
