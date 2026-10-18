// Supabase Edge Function: notify-event
// Trigger: DB webhook on events INSERT
// Sends Expo push notifications and in-app notifications for new events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface EventPayload {
  type: "INSERT";
  table: "events";
  record: {
    id: string;
    title: string;
    description: string;
    start_at: string;
    location: string;
  };
}

serve(async (req: Request) => {
  try {
    const payload: EventPayload = await req.json();
    const { record } = payload;

    if (!record || !record.title) {
      return new Response(JSON.stringify({ message: "No event record found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, push_token");

    if (profileErr) throw profileErr;

    const tokens = (profiles || [])
      .map((p) => p.push_token)
      .filter((token): token is string => Boolean(token && token.startsWith("ExponentPushToken")));

    if (tokens.length > 0) {
      const messages = tokens.map((token) => ({
        to: token,
        sound: "default",
        title: `🗓️ New Event: ${record.title}`,
        body: `Happening at ${record.location}. Tap to register!`,
        data: {
          type: "event",
          id: record.id,
        },
      }));

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
    }

    if (profiles && profiles.length > 0) {
      const logs = profiles.map((p) => ({
        user_id: p.id,
        title: `New Event: ${record.title}`,
        message: `Scheduled at ${record.location}`,
        type: "event",
        link_url: `/events/${record.id}`,
        read: false,
      }));

      await supabase.from("notifications_log").insert(logs);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifiedTokens: tokens.length,
        notifiedUsers: profiles?.length || 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
