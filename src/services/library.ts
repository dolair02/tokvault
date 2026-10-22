import { SavedTikTok } from '../types';
import { parseTikTokUrlParts } from './tiktokService';
export function linkKey(url: string): string {
  const { videoId } = parseTikTokUrlParts(url);
  if (videoId) return `video:${videoId}`;
  try { const u = new URL(url); return u.hostname.toLowerCase().replace(/^www\./, '') + u.pathname.replace(/\/+$/, ''); } catch { return url.trim(); }
}
export function sameVideo(a: Pick<SavedTikTok, 'url' | 'videoId' | 'originalUrl'>, b: Pick<SavedTikTok, 'url' | 'videoId' | 'originalUrl'>) {
  if (a.videoId && b.videoId && a.videoId === b.videoId) return true;
  return [a.url, a.originalUrl].filter(Boolean).some(x => [b.url, b.originalUrl].filter(Boolean).some(y => linkKey(x!) === linkKey(y!)));
}
export function mergeLibraries(local: SavedTikTok[], remote: SavedTikTok[]) {
  const result = [...local];
  for (const item of remote) if (!result.some(x => sameVideo(x, item))) result.push(item);
  return result;
}
