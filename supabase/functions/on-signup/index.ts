// Supabase Edge Function: on-signup
// Triggered on student sign-up with Firebase Auth or DB webhook
// Inserts or upserts the profile row into public.profiles using the Service Role Key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface OnSignupPayload {
  idToken?: string;
  fullName?: string;
  department?: string;
  avatarUrl?: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; department?: string; avatar_url?: string };
  };
  record?: {
    id: string;
    email?: string;
    raw_user_meta_data?: { full_name?: string; department?: string };
  };
}

serve(async (req: Request) => {
  // CORS Headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const payload: OnSignupPayload = await req.json();
    let uid = "";
    let email = "";
    let fullName = payload.fullName || "";
    let department = payload.department || "Computer Science & Engineering";
    let avatarUrl = payload.avatarUrl || null;

    // 1. If Firebase idToken is passed, decode JWT payload
    if (payload.idToken) {
      try {
        const parts = payload.idToken.split(".");
        if (parts.length === 3) {
          const decoded = JSON.parse(atob(parts[1]));
          uid = decoded.user_id || decoded.sub || "";
          email = decoded.email || "";
          if (!fullName && decoded.name) fullName = decoded.name;
        }
      } catch (tokenErr) {
        console.warn("Could not parse JWT token claims:", tokenErr);
      }
    }

    // 2. Fallback to user/record payload
    if (!uid) {
      const userObj = payload.user || payload.record;
      if (userObj?.id) {
        uid = userObj.id;
        email = userObj.email || "";
        fullName =
          fullName ||
          userObj.user_metadata?.full_name ||
          userObj.raw_user_meta_data?.full_name ||
          email.split("@")[0] ||
          "Club Member";
      }
    }

    if (!uid) {
      return new Response(JSON.stringify({ error: "Missing user UID or idToken" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is the first registered user / no super_admin exists yet
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");

    const isFirstUser = (count === 0);
    const assignedRole = isFirstUser ? "super_admin" : "member";

    // Upsert profile record
    const { data, error } = await supabase.from("profiles").upsert(
      {
        id: uid,
        email,
        full_name: fullName || (isFirstUser ? "Club Admin" : "Club Member"),
        role: assignedRole,
        department,
        avatar_url: avatarUrl,
        is_verified: true,
        verification_status: "verified",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, profile: data }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
