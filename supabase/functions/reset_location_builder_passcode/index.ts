/// <reference types="https://deno.land/x/types@v0.1.0/index.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../shared/cors.ts";
import {
  generateNumericPasscode,
  generateSalt,
  sha256Hex,
} from "../shared/builderPasscode.ts";

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

export default Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(500, { error: "Missing Supabase env vars" });
  }

  // Authenticated client (to identify caller)
  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await authedClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const { location_id } = (await req.json().catch(() => ({}))) as {
    location_id?: string;
  };
  if (!location_id) {
    return jsonResponse(400, { error: "location_id is required" });
  }

  // Service client for DB access
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Fetch location school_id
  const { data: location, error: locErr } = await serviceClient
    .from("locations")
    .select("id, school_id")
    .eq("id", location_id)
    .single();

  if (locErr || !location) {
    return jsonResponse(404, { error: "Location not found" });
  }

  // Verify caller is an admin for this school (based on public.profiles)
  const { data: profile, error: profErr } = await serviceClient
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .single();

  if (profErr || !profile) {
    return jsonResponse(403, { error: "Forbidden" });
  }

  const role = String(profile.role ?? "");
  const isAdmin =
    role === "admin" || role === "super-admin" || role === "super_admin";
  const sameSchool = profile.school_id === location.school_id;

  if (!isAdmin || !sameSchool) {
    return jsonResponse(403, { error: "Forbidden" });
  }

  const passcodePlain = generateNumericPasscode(6);
  const salt = generateSalt(16);
  const hash = await sha256Hex(`${salt}${passcodePlain}`);

  const { error: updErr } = await serviceClient
    .from("locations")
    .update({
      builder_passcode_salt: salt,
      builder_passcode_hash: hash,
      builder_passcode_updated_at: new Date().toISOString(),
    })
    .eq("id", location_id);

  if (updErr) {
    return jsonResponse(500, { error: updErr.message ?? "Failed to update" });
  }

  return jsonResponse(200, {
    location_id,
    passcode: passcodePlain, // returned ONCE to admin so they can share it
  });
});

