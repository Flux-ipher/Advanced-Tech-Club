// Supabase Edge Function: on-signup
// Trigger: Auth webhook or fallback endpoint for creating user profiles with role 'member'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const user = payload.record || payload.user;

    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "Missing user object" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fullName =
      user.user_metadata?.full_name ||
      user.raw_user_meta_data?.full_name ||
      user.email?.split("@")[0] ||
      "Club Member";

    const { data, error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      role: "member",
      avatar_url: user.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, profile: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
