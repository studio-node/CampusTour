/// <reference types="https://deno.land/x/types@v0.1.0/index.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../shared/cors.ts";
import { constantTimeEqual, sha256Hex } from "../shared/builderPasscode.ts";

type Json = Record<string, unknown>;

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

const ALLOWED_FIELDS = new Set([
  "description",
  "interests",
  "careers",
  "talking_points",
  "features",
]);

export default Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: "Missing Supabase env vars" });
  }

  const body = (await req.json().catch(() => ({}))) as {
    location_id?: string;
    passcode?: string;
    patch?: Record<string, unknown>;
  };

  const location_id = body.location_id;
  const passcode = body.passcode;
  const patch = body.patch ?? {};

  if (!location_id || !passcode) {
    return jsonResponse(400, { error: "location_id and passcode are required" });
  }

  // Allowlist patch fields
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    updateData[key] = value;
  }

  if (Object.keys(updateData).length === 0) {
    return jsonResponse(400, { error: "No allowed fields to update" });
  }

  // Service client (bypasses RLS)
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: location, error: locErr } = await serviceClient
    .from("locations")
    .select(
      "id, builder_passcode_salt, builder_passcode_hash, description, interests, careers, talking_points, features",
    )
    .eq("id", location_id)
    .single();

  if (locErr || !location) {
    return jsonResponse(404, { error: "Location not found" });
  }

  const salt = String(location.builder_passcode_salt ?? "");
  const hash = String(location.builder_passcode_hash ?? "");

  if (!salt || !hash) {
    return jsonResponse(403, { error: "Builder editing not enabled" });
  }

  const computed = await sha256Hex(`${salt}${passcode}`);
  if (!constantTimeEqual(computed, hash)) {
    return jsonResponse(403, { error: "Invalid passcode" });
  }

  const { data: updated, error: updErr } = await serviceClient
    .from("locations")
    .update(updateData)
    .eq("id", location_id)
    .select("id, description, interests, careers, talking_points, features")
    .single();

  if (updErr) {
    return jsonResponse(500, { error: updErr.message ?? "Failed to update" });
  }

  return jsonResponse(200, { success: true, data: updated });
});

