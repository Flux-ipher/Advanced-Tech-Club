// Supabase Edge Function: send-push-notification
// Trigger: DB webhook on announcements INSERT
// Sends Expo push notifications to all users with a registered push_token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface WebhookPayload {
  type: "INSERT";
  table: "announcements";
  record: {
    id: string;
    title: string;
    body: string;
    category?: string;
    pinned?: boolean;
  };
}

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { record } = payload;

    if (!record || !record.title) {
      return new Response(JSON.stringify({ message: "No announcement record found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all profiles with valid push tokens
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, push_token")
      .not("push_token", "is", null);

    if (profileErr) {
      throw profileErr;
    }

    // Filter valid Expo push tokens
    const tokens = (profiles || [])
      .map((p) => p.push_token)
      .filter((token): token is string => Boolean(token && token.startsWith("ExponentPushToken")));

    // Batch send via Expo Push API
    if (tokens.length > 0) {
      const messages = tokens.map((token) => ({
        to: token,
        sound: "default",
        title: `📢 New ATC Announcement: ${record.title}`,
        body: record.body.length > 120 ? `${record.body.slice(0, 117)}...` : record.body,
        data: {
          type: "announcement",
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

    // Also insert records into notifications_log for in-app bell
    if (profiles && profiles.length > 0) {
      const logs = profiles.map((p) => ({
        user_id: p.id,
        title: `New Announcement: ${record.title}`,
        message: record.body.slice(0, 100),
        type: "announcement",
        link_url: "/",
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
