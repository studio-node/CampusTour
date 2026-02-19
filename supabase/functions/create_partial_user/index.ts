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

// Generate a random password for the temporary user account
function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

  // Get authenticated user from request
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header" });
  }

  // Create service client (bypasses RLS, has admin permissions)
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Create user client with their token to validate authentication
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  // Get the authenticated user
  const {
    data: { user: callerUser },
    error: callerError,
  } = await userClient.auth.getUser();

  if (callerError || !callerUser) {
    return jsonResponse(401, { error: "Invalid authentication" });
  }

  // Parse request body
  let body: {
    email?: string;
    full_name?: string;
    role?: string;
    creation_token?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { email, full_name, role, creation_token } = body;

  // Validate required fields
  if (!email || !full_name || !role || !creation_token) {
    return jsonResponse(400, {
      error: "email, full_name, role, and creation_token are required",
    });
  }

  // Get caller's profile
  const { data: callerProfile, error: profileError } = await serviceClient
    .from("profiles")
    .select("school_id, role")
    .eq("id", callerUser.id)
    .single();

  if (profileError || !callerProfile) {
    return jsonResponse(403, {
      error: "Caller profile not found",
    });
  }

  const callerSchoolId = callerProfile.school_id;
  const callerRole = callerProfile.role?.toLowerCase().trim();

  // Validate caller is admin in a school
  const adminRoles = ["admin", "super-admin", "super_admin", "super admin"];
  if (
    !callerSchoolId ||
    !adminRoles.includes(callerRole)
  ) {
    return jsonResponse(403, {
      error: "Caller is not an admin in a school",
    });
  }

  // Check email uniqueness
  const { data: existingProfile } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("email", email.trim())
    .single();

  if (existingProfile) {
    return jsonResponse(400, { error: "Email already exists" });
  }

  // Check creation_token uniqueness
  const { data: existingToken } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("creation_token", creation_token)
    .single();

  if (existingToken) {
    return jsonResponse(400, {
      error: "Creation token already in use. Please generate a new PIN.",
    });
  }

  // Create user using Admin API
  // This will trigger handle_new_user() which creates the profile
  const tempPassword = generateRandomPassword();
  const { data: newUser, error: createError } =
    await serviceClient.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword, // Temporary password, user will set their own via PIN
      email_confirm: false, // Don't auto-confirm email
      user_metadata: {
        full_name: full_name.trim(),
        user_type: role, // Trigger expects 'user_type' in metadata
        school_id: callerSchoolId,
      },
    });

  if (createError || !newUser?.user) {
    return jsonResponse(500, {
      error: `Failed to create user: ${createError?.message || "Unknown error"}`,
    });
  }

  const userId = newUser.user.id;

  // Wait a moment for the trigger to create the profile
  // Then update it with creation_token, email, and is_active
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Update profile: set creation_token, email, is_active=false
  const { error: updateError } = await serviceClient
    .from("profiles")
    .update({
      creation_token: creation_token,
      email: email.trim(),
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    // If profile update fails, try to clean up the auth user
    await serviceClient.auth.admin.deleteUser(userId);
    return jsonResponse(500, {
      error: `Failed to update profile: ${updateError.message}`,
    });
  }

  return jsonResponse(200, {
    ok: true,
    user_id: userId,
  });
});
