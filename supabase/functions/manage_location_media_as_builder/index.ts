/// <reference types="https://deno.land/x/types@v0.1.0/index.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { constantTimeEqual, sha256Hex } from "../_shared/builderPasscode.ts";

type Json = Record<string, unknown>;

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ALLOWED_MEDIA_TYPES = new Set(["primaryImage", "additional"]);

async function validatePasscode(
  serviceClient: ReturnType<typeof createClient>,
  locationId: string,
  passcode: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: location, error: locErr } = await serviceClient
    .from("locations")
    .select("id, builder_passcode_salt, builder_passcode_hash")
    .eq("id", locationId)
    .single();

  if (locErr || !location) {
    return { ok: false, error: "Location not found" };
  }

  const salt = String(location.builder_passcode_salt ?? "");
  const hash = String(location.builder_passcode_hash ?? "");

  if (!salt || !hash) {
    return { ok: false, error: "Builder editing not enabled" };
  }

  const computed = await sha256Hex(`${salt}${passcode}`);
  if (!constantTimeEqual(computed, hash)) {
    return { ok: false, error: "Invalid passcode" };
  }

  return { ok: true };
}

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

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const contentType = req.headers.get("content-type") ?? "";

  // Handle multipart (file upload)
  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonResponse(400, { error: "Invalid form data" });
    }

    const locationId = formData.get("location_id")?.toString();
    const passcode = formData.get("passcode")?.toString();
    const mediaType = formData.get("media_type")?.toString();
    const file = formData.get("file");

    if (!locationId || !passcode || !mediaType || !(file instanceof File)) {
      return jsonResponse(400, {
        error: "location_id, passcode, media_type, and file are required",
      });
    }

    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
      return jsonResponse(400, { error: "media_type must be primaryImage or additional" });
    }

    const valid = await validatePasscode(serviceClient, locationId, passcode);
    if (!valid.ok) {
      return jsonResponse(403, { error: valid.error });
    }

    if (mediaType === "primaryImage") {
      await serviceClient
        .from("location_media")
        .delete()
        .eq("location_id", locationId)
        .eq("media_type", "primaryImage");
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `${locationId}/${filename}`;

    const { error: uploadErr } = await serviceClient.storage
      .from("media")
      .upload(path, file.stream(), { contentType: file.type, upsert: false });

    if (uploadErr) {
      return jsonResponse(500, { error: uploadErr.message ?? "Upload failed" });
    }

    const { data: urlData } = serviceClient.storage.from("media").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { data: inserted, error: insertErr } = await serviceClient
      .from("location_media")
      .insert({
        location_id: locationId,
        stored_in_supabase: true,
        media_type: mediaType,
        url: publicUrl,
      })
      .select()
      .single();

    if (insertErr) {
      return jsonResponse(500, { error: insertErr.message ?? "Failed to save media" });
    }

    return jsonResponse(200, { success: true, data: inserted });
  }

  // Handle JSON (add_url, delete)
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    location_id?: string;
    passcode?: string;
    media_type?: string;
    url?: string;
    media_id?: string;
  };

  const action = body.action;
  const locationId = body.location_id;
  const passcode = body.passcode;

  if (!locationId || !passcode) {
    return jsonResponse(400, { error: "location_id and passcode are required" });
  }

  const valid = await validatePasscode(serviceClient, locationId, passcode);
  if (!valid.ok) {
    return jsonResponse(403, { error: valid.error });
  }

  if (action === "add_url") {
    const mediaType = body.media_type;
    const url = body.url;

    if (!mediaType || !url || typeof url !== "string") {
      return jsonResponse(400, { error: "media_type and url are required" });
    }
    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
      return jsonResponse(400, { error: "media_type must be primaryImage or additional" });
    }

    if (mediaType === "primaryImage") {
      await serviceClient
        .from("location_media")
        .delete()
        .eq("location_id", locationId)
        .eq("media_type", "primaryImage");
    }

    const { data: inserted, error: insertErr } = await serviceClient
      .from("location_media")
      .insert({
        location_id: locationId,
        stored_in_supabase: false,
        media_type: mediaType,
        url: url.trim(),
      })
      .select()
      .single();

    if (insertErr) {
      return jsonResponse(500, { error: insertErr.message ?? "Failed to add media" });
    }

    return jsonResponse(200, { success: true, data: inserted });
  }

  if (action === "delete") {
    const mediaId = body.media_id;
    if (!mediaId) {
      return jsonResponse(400, { error: "media_id is required" });
    }

    const { data: media } = await serviceClient
      .from("location_media")
      .select("id, location_id, url, stored_in_supabase")
      .eq("id", mediaId)
      .eq("location_id", locationId)
      .single();

    if (!media) {
      return jsonResponse(404, { error: "Media not found" });
    }

    const { error: delErr } = await serviceClient
      .from("location_media")
      .delete()
      .eq("id", mediaId);

    if (delErr) {
      return jsonResponse(500, { error: delErr.message ?? "Failed to delete" });
    }

    if (media.stored_in_supabase && media.url) {
      const pathMatch = media.url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
      if (pathMatch) {
        await serviceClient.storage.from("media").remove([pathMatch[1]]);
      }
    }

    return jsonResponse(200, { success: true });
  }

  return jsonResponse(400, { error: "Invalid action" });
});
