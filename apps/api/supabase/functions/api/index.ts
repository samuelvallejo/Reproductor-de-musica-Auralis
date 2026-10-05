import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Spotify's Client ID is public and is safe to expose to a PKCE client.
const spotifyClientId = "866302798b354890ad6a1d168425dc40";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve((request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const path = new URL(request.url).pathname;
  if (request.method !== "GET" || !path.endsWith("/api/spotify/config")) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Este recurso no existe." } },
      { status: 404, headers: corsHeaders },
    );
  }

  if (!/^[a-fA-F0-9]{32}$/.test(spotifyClientId)) {
    return Response.json(
      { error: { code: "SPOTIFY_NOT_CONFIGURED", message: "Spotify no está configurado." } },
      { status: 503, headers: { ...corsHeaders, "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { clientId: spotifyClientId },
    { headers: { ...corsHeaders, "Cache-Control": "no-store" } },
  );
});
