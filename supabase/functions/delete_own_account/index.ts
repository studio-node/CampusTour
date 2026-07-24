/// <reference types="https://deno.land/x/types@v0.1.0/index.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Json = Record<string, unknown>;

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";

  // Authenticated client identifies the caller from their own JWT.
  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await authedClient.auth.getUser();

  if (userError || !user) {
    console.error(
      "delete_own_account: getUser failed",
      "hasAuthHeader:", Boolean(authHeader),
      "authHeaderPrefix:", authHeader.slice(0, 16),
      "error:", userError?.message,
    );
    return jsonResponse(401, {
      error: `Unauthorized${userError?.message ? `: ${userError.message}` : " (no user found for token)"}`,
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // tour_appointments.ambassador_id cascades on profile delete. Unassign first so
  // deleting an ambassador's account doesn't wipe the school's scheduled tour records.
  const { error: unassignError } = await serviceClient
    .from("tour_appointments")
    .update({ ambassador_id: null })
    .eq("ambassador_id", user.id);

  if (unassignError) {
    return jsonResponse(500, {
      error: `Failed to unassign tour appointments: ${unassignError.message}`,
    });
  }

  // Deleting the auth user cascades to public.profiles (profiles_id_fkey ON DELETE CASCADE),
  // which is the only remaining place this user's data lives.
  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return jsonResponse(500, {
      error: `Failed to delete account: ${deleteError.message}`,
    });
  }

  return jsonResponse(200, { ok: true });
});
