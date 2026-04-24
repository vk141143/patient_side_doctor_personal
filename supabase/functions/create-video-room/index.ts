import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// DAILY_API_KEY secret now holds the VideoSDK JWT token
const VIDEOSDK_TOKEN = Deno.env.get("DAILY_API_KEY");
const VIDEOSDK_API   = "https://api.videosdk.live/v2/rooms";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!VIDEOSDK_TOKEN) {
    return new Response(JSON.stringify({ error: "DAILY_API_KEY secret not set" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const session_id: string | undefined = body.session_id ?? body.sessionId;
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Derive a stable customRoomId from the session UUID (alphanumeric, max 36 chars)
    const customRoomId = "mc" + session_id.replace(/-/g, "").slice(0, 20);

    // Generate a unique participant token scoped to this room
    // VIDEOSDK_TOKEN is the API key — we return it directly as the auth token
    // Both sides get the same API key but VideoSDK identifies participants by name+meetingId
    // To avoid same-participant conflict, token is the same but names must differ

    // 1. Try to fetch existing room by customRoomId
    const getRes = await fetch(`${VIDEOSDK_API}/${customRoomId}`, {
      headers: { Authorization: VIDEOSDK_TOKEN },
    });

    if (getRes.ok) {
      const room = await getRes.json();
      if (room.roomId) {
        return new Response(JSON.stringify({ roomId: room.roomId, token: VIDEOSDK_TOKEN }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Create new room
    const createRes = await fetch(VIDEOSDK_API, {
      method: "POST",
      headers: {
        Authorization: VIDEOSDK_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customRoomId }),
    });

    const room = await createRes.json();

    if (!room.roomId) {
      console.error("[create-video-room] VideoSDK error:", JSON.stringify(room));
      return new Response(JSON.stringify({ error: "Failed to create room", detail: room }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ roomId: room.roomId, token: VIDEOSDK_TOKEN }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[create-video-room] exception:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
