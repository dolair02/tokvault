import React, { useState } from 'react';
import { Copy, Share2, X, MessageCircle } from 'lucide-react';
import { SavedTikTok } from './types';
export default function ShareLink({ item, onClose }: { item: SavedTikTok; onClose: () => void }) {
  const [feedback, setFeedback] = useState('');
  async function share() {
    if (!navigator.share) { setFeedback('Select and copy the link below, then paste it into your favorite app.'); return; }
    try { await navigator.share({ title: item.title, url: item.url }); }
    catch (error) { if ((error as Error).name !== 'AbortError') setFeedback('Sharing isn’t available here. Select and copy the link below instead.'); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(item.url); setFeedback('Link copied. Paste it into Messages or another app.'); }
    catch { setFeedback('Press and hold the link below, then choose Copy.'); }
  }
  return <div className="fixed inset-0 z-[80] bg-black/75 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={e => e.stopPropagation()} className="w-full max-w-md p-5 rounded-t-2xl sm:rounded-2xl bg-[#14161D] border border-[#2B3042]" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between mb-4"><h2 id="share-title" className="text-xl font-bold">Share TikTok link</h2><button aria-label="Close sharing" onClick={onClose} className="p-2"><X className="w-5 h-5" /></button></div>
      <p className="text-sm text-slate-400 mb-4">Send the original link. Your private notes and tags stay in your vault.</p>
      <button onClick={share} className="w-full rounded-xl bg-[#FE2C55] p-4 flex justify-center items-center gap-2 font-semibold"><Share2 className="w-5 h-5" />Share to apps</button>
      <p className="text-xs text-slate-400 mt-3 mb-4">Choose from the apps offered by your phone. Some social apps may only accept pasted links.</p>
      <div className="flex gap-2"><a className="flex-1 bg-[#242837] p-3 rounded-xl flex items-center justify-center gap-2 text-sm" href={`sms:?body=${encodeURIComponent(item.url)}`}><MessageCircle className="w-4 h-4" />Text message</a><button onClick={copy} className="flex-1 bg-[#242837] p-3 rounded-xl flex items-center justify-center gap-2 text-sm"><Copy className="w-4 h-4" />Copy link</button></div>
      <label className="block text-xs text-slate-400 mt-5">Original TikTok URL<input aria-label="Original TikTok URL" readOnly value={item.url} onFocus={e => e.target.select()} className="block w-full rounded-lg bg-[#0B0C10] border border-[#34394C] mt-2 p-3 text-sm text-white" /></label>
      {feedback && <p role="status" className="mt-4 text-sm text-[#25F4EE]">{feedback}</p>}
    </section>
  </div>;
}
