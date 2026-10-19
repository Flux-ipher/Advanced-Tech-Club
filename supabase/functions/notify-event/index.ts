// Supabase Edge Function: notify-event
// Trigger: DB webhook on events INSERT
// Delivers notifications for workshops & events via FCM and Expo Push API

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
    const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, push_token, fcm_token");

    if (profileErr) throw profileErr;

    const allProfiles = profiles || [];
    const fcmTokens = allProfiles
      .map((p) => p.fcm_token || p.push_token)
      .filter((token): token is string => Boolean(token && !token.startsWith("ExponentPushToken")));

    const expoTokens = allProfiles
      .map((p) => p.push_token)
      .filter((token): token is string => Boolean(token && token.startsWith("ExponentPushToken")));

    // 1. Deliver via FCM
    if (firebaseServerKey && fcmTokens.length > 0) {
      try {
        await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${firebaseServerKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registration_ids: fcmTokens,
            notification: {
              title: `🗓️ New ATC Event: ${record.title}`,
              body: `Happening at ${record.location}. Tap to view curriculum & RSVP!`,
              sound: "default",
            },
            data: {
              type: "event",
              id: record.id,
            },
          }),
        });
      } catch (fcmErr) {
        console.warn("[FCM Event Push Error]:", fcmErr);
      }
    }

    // 2. Deliver via Expo Push API
    if (expoTokens.length > 0) {
      try {
        const messages = expoTokens.map((token) => ({
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
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });
      } catch (expoErr) {
        console.warn("[Expo Event Push Error]:", expoErr);
      }
    }

    // 3. Log in-app notifications
    if (allProfiles.length > 0) {
      const logs = allProfiles.map((p) => ({
        user_id: p.id,
        title: `Upcoming Workshop: ${record.title}`,
        message: `Scheduled at ${record.location}. Reserve your seat now!`,
        type: "event",
        link_url: `/portal/events/${record.id}`,
        read: false,
      }));

      await supabase.from("notifications_log").insert(logs);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fcmCount: fcmTokens.length,
        expoCount: expoTokens.length,
        totalUsers: allProfiles.length,
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
