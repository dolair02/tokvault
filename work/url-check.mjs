// src/services/tiktokService.ts
var DEFAULT_COLLECTIONS = [
  { id: "watch-later", name: "Watch Later", icon: "Clock", color: "#25F4EE" },
  { id: "recipes", name: "Recipes & Food", icon: "Utensils", color: "#FF9F1C" },
  { id: "fitness", name: "Workouts & Health", icon: "Dumbbell", color: "#2EC4B6" },
  { id: "tech", name: "Tech & AI Hacks", icon: "Cpu", color: "#A855F7" },
  { id: "travel", name: "Places & Travel", icon: "MapPin", color: "#3B82F6" },
  { id: "shopping", name: "Finds & Gift Ideas", icon: "ShoppingBag", color: "#FE2C55" }
];
var SAMPLE_TIKTOKS = [
  {
    id: "sample-1",
    url: "https://www.tiktok.com/@scout2015/video/6718335390845095173",
    videoId: "6718335390845095173",
    embedUrl: "https://www.tiktok.com/player/v1/6718335390845095173?music_info=1&description=1",
    title: "Scramble up ur name & I\u2019ll try to guess it\u{1F60D}\u2764\uFE0F #foryoupage #petsoftiktok #aesthetic",
    authorName: "Scout, Suki & Stella",
    authorHandle: "@scout2015",
    thumbnailUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80",
    collectionId: "watch-later",
    tags: ["petsoftiktok", "cute", "dogs"],
    notes: "Cute golden retriever video \u2014 great example of live TikTok embed player!",
    isFavorite: true,
    createdAt: new Date(Date.now() - 1e3 * 60 * 60 * 2).toISOString()
  },
  {
    id: "sample-2",
    url: "https://www.tiktok.com/@GordonRamsay/video/7106594312292453675",
    videoId: "7106594312292453675",
    embedUrl: "https://www.tiktok.com/player/v1/7106594312292453675?music_info=1&description=1",
    title: "15-Minute Crispy Chili Garlic Noodles for busy weeknights #recipe #easyrecipe #noodles #dinnerideas",
    authorName: "Chef Kitchen Hacks",
    authorHandle: "@chefkitchenhacks",
    thumbnailUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
    collectionId: "recipes",
    tags: ["recipe", "easyrecipe", "noodles", "dinnerideas", "15min"],
    notes: "Use low-sodium soy sauce, 2 tbsp chili crisp, 3 cloves minced garlic, and sesame oil.",
    isFavorite: true,
    createdAt: new Date(Date.now() - 1e3 * 60 * 60 * 18).toISOString()
  },
  {
    id: "sample-3",
    url: "https://www.tiktok.com/@tiktok/video/7106594312292453675",
    videoId: "7106594312292453675",
    embedUrl: "https://www.tiktok.com/player/v1/7106594312292453675?music_info=1&description=1",
    title: "5 MacBook & iOS shortcuts nobody talks about that save 2 hours a day #techhacks #macbook #productivity",
    authorName: "Tech Workflow Daily",
    authorHandle: "@techworkflow",
    thumbnailUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
    collectionId: "tech",
    tags: ["techhacks", "macbook", "productivity", "shortcuts"],
    notes: "Cmd+Shift+Period shows hidden files in Finder; Option+Shift+Volume adjusts in quarter steps.",
    isFavorite: false,
    createdAt: new Date(Date.now() - 1e3 * 60 * 60 * 48).toISOString()
  }
];
function extractTikTokUrl(rawInput) {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;
  const candidates = trimmed.match(/https?:\/\/[^\s]+/gi) || [/^(www\.|vm\.|vt\.)?tiktok\.com\/.+/i.test(trimmed) ? `https://${trimmed}` : ""];
  for (const candidate of candidates) {
    try {
      const u = new URL(candidate.replace(/[.,;!?)]+$/, ""));
      const host = u.hostname.toLowerCase();
      if (u.protocol === "https:" && (host === "tiktok.com" || host.endsWith(".tiktok.com")) && u.pathname.length > 1) return u.href;
    } catch {
    }
  }
  return null;
}
function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  const unique = new Set(
    matches.map((tag) => tag.slice(1).toLowerCase()).filter((t) => t.length > 1 && !["fyp", "foryou", "foryoupage", "viral", "tiktok"].includes(t))
  );
  return Array.from(unique).slice(0, 8);
}
function parseTikTokUrlParts(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    let handle;
    let videoId;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (part.startsWith("@")) {
        handle = part;
      }
      if ((part === "video" || part === "photo") && pathParts[i + 1]) {
        const candidateId = pathParts[i + 1].match(/^(\d+)/);
        if (candidateId) {
          videoId = candidateId[1];
        }
      }
    }
    if (!videoId) {
      const numericMatch = parsed.pathname.match(/\/(\d{15,22})/);
      if (numericMatch) {
        videoId = numericMatch[1];
      }
    }
    return { handle, videoId };
  } catch {
    return {};
  }
}
async function boundedFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6e3);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok ? await response.json() : null;
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchTikTokMetadata(rawUrl) {
  const cleanUrl = extractTikTokUrl(rawUrl) || rawUrl.trim();
  const initialParts = parseTikTokUrlParts(cleanUrl);
  let resolvedUrl = cleanUrl;
  let videoId = initialParts.videoId;
  let authorHandle = initialParts.handle || "@tiktok_creator";
  let authorName = initialParts.handle ? initialParts.handle.replace(/^@/, "") : "TikTok Creator";
  let title = "";
  let thumbnailUrl;
  let publishedAt;
  const oembedPromise = boundedFetch(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`
  ).catch(() => null);
  const microlinkPromise = boundedFetch(
    `https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`
  ).catch(() => null);
  const [oembedData, microlinkResp] = await Promise.all([oembedPromise, microlinkPromise]);
  if (oembedData) {
    if (oembedData.embed_product_id) {
      videoId = String(oembedData.embed_product_id);
    }
    if (oembedData.title) {
      title = oembedData.title;
    }
    if (oembedData.author_name) {
      authorName = oembedData.author_name;
    }
    if (oembedData.author_unique_id) {
      authorHandle = `@${oembedData.author_unique_id}`;
    } else if (oembedData.author_url) {
      const handleMatch = String(oembedData.author_url).match(/@([a-zA-Z0-9_.-]+)/);
      if (handleMatch) authorHandle = `@${handleMatch[1]}`;
    }
    if (oembedData.thumbnail_url) {
      thumbnailUrl = oembedData.thumbnail_url;
    }
  }
  if (microlinkResp && microlinkResp.status === "success" && microlinkResp.data) {
    const ml = microlinkResp.data;
    if (ml.url && typeof ml.url === "string" && extractTikTokUrl(ml.url)) {
      resolvedUrl = ml.url;
      const resolvedParts = parseTikTokUrlParts(resolvedUrl);
      if (!videoId && resolvedParts.videoId) videoId = resolvedParts.videoId;
      if (resolvedParts.handle) authorHandle = resolvedParts.handle;
    }
    if (!title && ml.description) {
      title = ml.description;
    } else if (!title && ml.title) {
      title = ml.title;
    }
    if (ml.author && (authorName === "TikTok Creator" || authorName === authorHandle.replace(/^@/, ""))) {
      authorName = ml.author;
    }
    if (ml.title && authorHandle === "@tiktok_creator") {
      const handleInTitle = String(ml.title).match(/\(@([a-zA-Z0-9_.-]+)\)/);
      if (handleInTitle) {
        authorHandle = `@${handleInTitle[1]}`;
      }
    }
    if (!thumbnailUrl && ml.image && ml.image.url) {
      thumbnailUrl = ml.image.url;
    }
    if (ml.date) {
      publishedAt = ml.date;
    }
  }
  if (!videoId && resolvedUrl !== cleanUrl) {
    try {
      const secondOembed = await boundedFetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`
      );
      if (secondOembed?.embed_product_id) {
        videoId = String(secondOembed.embed_product_id);
      }
    } catch {
    }
  }
  if (!title) {
    title = `Saved TikTok from ${authorHandle}`;
  }
  const embedUrl = videoId ? `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1` : void 0;
  const tags = extractHashtags(title);
  return {
    url: resolvedUrl,
    videoId,
    embedUrl,
    title,
    authorName,
    authorHandle,
    thumbnailUrl,
    tags,
    publishedAt
  };
}
export {
  DEFAULT_COLLECTIONS,
  SAMPLE_TIKTOKS,
  extractHashtags,
  extractTikTokUrl,
  fetchTikTokMetadata,
  parseTikTokUrlParts
};
