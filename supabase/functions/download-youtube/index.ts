import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "Missing or invalid 'url' field" }, 400);
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return jsonResponse(
        { error: "Could not extract YouTube video ID from URL" },
        400
      );
    }

    console.log(`Processing video: ${videoId}`);

    // Step 1: Get metadata and streaming data
    const videoInfo = await getVideoInfo(videoId);
    console.log(
      `Video: "${videoInfo.title}" by ${videoInfo.artist}, ${videoInfo.duration}s`
    );

    // Step 2: Get best audio stream URL
    const audioStream = pickBestAudio(videoInfo.adaptiveFormats);
    if (!audioStream) {
      throw new Error(
        `No audio stream found. Got ${videoInfo.adaptiveFormats.length} formats total.`
      );
    }

    console.log(`Audio: ${audioStream.mimeType}, ${audioStream.bitrate}bps`);

    // Step 3: Download audio
    const audioResp = await fetch(audioStream.url, {
      headers: {
        "User-Agent":
          "com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!audioResp.ok) {
      throw new Error(`Audio download failed: ${audioResp.status}`);
    }

    const audioBuffer = new Uint8Array(await audioResp.arrayBuffer());
    console.log(`Downloaded ${audioBuffer.byteLength} bytes`);

    if (audioBuffer.byteLength < 1000) {
      throw new Error("Downloaded file too small, likely an error page");
    }

    // Step 4: Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ext = audioStream.mimeType.includes("webm") ? ".webm" : ".m4a";
    const safeName = videoInfo.title
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60);
    const storagePath = `tracks/${Date.now()}-${safeName}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("audio-files")
      .upload(storagePath, audioBuffer, {
        contentType: audioStream.mimeType.split(";")[0],
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log(`Uploaded: ${storagePath}`);

    // Step 5: Upload thumbnail
    let artworkUrl: string | null = null;
    if (videoInfo.thumbnailUrl) {
      try {
        const thumbResp = await fetch(videoInfo.thumbnailUrl);
        if (thumbResp.ok) {
          const thumbBuffer = new Uint8Array(await thumbResp.arrayBuffer());
          const thumbPath = `artwork/${Date.now()}-${safeName}.jpg`;
          const { error: thumbErr } = await supabase.storage
            .from("audio-files")
            .upload(thumbPath, thumbBuffer, {
              contentType: "image/jpeg",
              upsert: true,
            });
          if (!thumbErr) {
            const { data } = supabase.storage
              .from("audio-files")
              .getPublicUrl(thumbPath);
            artworkUrl = data.publicUrl;
          }
        }
      } catch {
        artworkUrl = videoInfo.thumbnailUrl;
      }
    }

    // Step 6: Insert track record
    const { data: track, error: dbError } = await supabase
      .from("tracks")
      .insert({
        title: videoInfo.title,
        artist: videoInfo.artist,
        duration: videoInfo.duration,
        youtube_url: url,
        storage_path: storagePath,
        artwork_url: artworkUrl,
        start_time: null,
        end_time: null,
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`DB insert failed: ${dbError.message}`);
    }

    console.log(`Track created: ${track.id}`);
    return jsonResponse({ track });
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: error.message || String(error) }, 500);
  }
});

// ── YouTube helpers ──

interface VideoInfo {
  title: string;
  artist: string;
  duration: number;
  thumbnailUrl: string;
  adaptiveFormats: AdaptiveFormat[];
}

interface AdaptiveFormat {
  url: string;
  mimeType: string;
  bitrate: number;
  contentLength: string;
}

async function getVideoInfo(videoId: string): Promise<VideoInfo> {
  // Step 1: Fetch the watch page to get a visitorData session token
  // YouTube requires this to authorize innertube API requests
  console.log("Fetching watch page for visitorData...");
  const watchResp = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Cookie: "CONSENT=PENDING+987",
      },
    }
  );

  if (!watchResp.ok) {
    throw new Error(`Watch page fetch failed: ${watchResp.status}`);
  }

  const html = await watchResp.text();
  console.log(`Watch page: ${html.length} bytes`);

  // Extract visitorData from the page
  const visitorMatch = html.match(/"visitorData"\s*:\s*"([^"]+)"/);
  const visitorData = visitorMatch ? visitorMatch[1] : "";
  console.log(`visitorData: ${visitorData ? "found" : "not found"}`);

  // Step 2: Call innertube player API with ANDROID_VR client + visitorData
  const body = {
    videoId,
    context: {
      client: {
        clientName: "ANDROID_VR",
        clientVersion: "1.57.29",
        androidSdkVersion: 34,
        hl: "en",
        gl: "US",
      },
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent":
      "com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip",
  };

  if (visitorData) {
    headers["X-Goog-Visitor-Id"] = visitorData;
  }

  const resp = await fetch(
    "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w&prettyPrint=false",
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `YouTube innertube API returned ${resp.status}: ${text.slice(0, 200)}`
    );
  }

  const data = await resp.json();

  if (data.playabilityStatus?.status !== "OK") {
    const reason =
      data.playabilityStatus?.reason ||
      data.playabilityStatus?.status ||
      "Unknown";
    throw new Error(`Video not playable: ${reason}`);
  }

  const details = data.videoDetails || {};
  const streamingData = data.streamingData || {};

  let title = details.title || "Unknown Title";
  let artist = details.author || "Unknown Artist";

  // Clean up "- Topic" suffix from auto-generated channels
  artist = artist.replace(/ - Topic$/, "");

  // Split "Artist - Title" format
  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }

  const thumbnails = details.thumbnail?.thumbnails || [];
  const thumbnailUrl =
    thumbnails[thumbnails.length - 1]?.url ||
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const adaptiveFormats = (streamingData.adaptiveFormats || [])
    .filter((f: any) => f.url)
    .map((f: any) => ({
      url: f.url,
      mimeType: f.mimeType || "",
      bitrate: f.bitrate || 0,
      contentLength: f.contentLength || "0",
    }));

  console.log(`Got ${adaptiveFormats.length} adaptive formats with direct URLs`);

  return {
    title,
    artist,
    duration: parseInt(details.lengthSeconds || "0", 10),
    thumbnailUrl,
    adaptiveFormats,
  };
}

function pickBestAudio(
  formats: AdaptiveFormat[]
): AdaptiveFormat | null {
  const audioFormats = formats.filter(
    (f) => f.mimeType.startsWith("audio/") && f.url
  );
  if (audioFormats.length === 0) return null;

  // Prefer mp4 audio, then pick highest bitrate
  const mp4Audio = audioFormats.filter((f) => f.mimeType.includes("mp4"));
  const candidates = mp4Audio.length > 0 ? mp4Audio : audioFormats;
  candidates.sort((a, b) => b.bitrate - a.bitrate);
  return candidates[0];
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
