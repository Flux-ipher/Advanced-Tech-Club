// Supabase Edge Function: send-push-notification
// Trigger: DB webhook on announcements INSERT
// Delivers notifications to registered devices via FCM and Expo Push API

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
    const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");
    const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all profiles with valid push/fcm tokens
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, push_token, fcm_token");

    if (profileErr) {
      throw profileErr;
    }

    const allProfiles = profiles || [];
    const fcmTokens = allProfiles
      .map((p) => p.fcm_token || p.push_token)
      .filter((token): token is string => Boolean(token && !token.startsWith("ExponentPushToken")));

    const expoTokens = allProfiles
      .map((p) => p.push_token)
      .filter((token): token is string => Boolean(token && token.startsWith("ExponentPushToken")));

    // 1. Deliver via Firebase Cloud Messaging (FCM Legacy / v1 Server Key)
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
              title: `📢 New ATC Announcement: ${record.title}`,
              body: record.body.length > 120 ? `${record.body.slice(0, 117)}...` : record.body,
              sound: "default",
            },
            data: {
              type: "announcement",
              id: record.id,
            },
          }),
        });
      } catch (fcmErr) {
        console.warn("[FCM Send Error]:", fcmErr);
      }
    }

    // 2. Deliver via Expo Push API
    if (expoTokens.length > 0) {
      try {
        const messages = expoTokens.map((token) => ({
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
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });
      } catch (expoErr) {
        console.warn("[Expo Push Error]:", expoErr);
      }
    }

    // 3. Log in-app bell notification
    if (allProfiles.length > 0) {
      const logs = allProfiles.map((p) => ({
        user_id: p.id,
        title: `New Announcement: ${record.title}`,
        message: record.body.slice(0, 100),
        type: "announcement",
        link_url: "/portal",
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
