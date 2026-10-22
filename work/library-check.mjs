// src/services/tiktokService.ts
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

// src/services/library.ts
function linkKey(url) {
  const { videoId } = parseTikTokUrlParts(url);
  if (videoId) return `video:${videoId}`;
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, "") + u.pathname.replace(/\/+$/, "");
  } catch {
    return url.trim();
  }
}
function sameVideo(a, b) {
  if (a.videoId && b.videoId && a.videoId === b.videoId) return true;
  return [a.url, a.originalUrl].filter(Boolean).some((x) => [b.url, b.originalUrl].filter(Boolean).some((y) => linkKey(x) === linkKey(y)));
}
function mergeLibraries(local, remote) {
  const result = [...local];
  for (const item of remote) if (!result.some((x) => sameVideo(x, item))) result.push(item);
  return result;
}
export {
  linkKey,
  mergeLibraries,
  sameVideo
};
