import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

export interface VaultProfile {
  name: string;
  source: string;
  purpose: string;
  frequency: string;
  organization: string;
  watchStyle: string;
  categoryIds: string[];
}
export const CATEGORY_OPTIONS = [
  { id: 'recipes', name: 'Recipes & Food', icon: 'Folder', color: '#FF9F1C' },
  { id: 'dining', name: 'Dining & Restaurants', icon: 'Folder', color: '#FB7185' },
  { id: 'travel', name: 'Places & Travel', icon: 'Folder', color: '#3B82F6' },
  { id: 'fitness', name: 'Fitness & Workouts', icon: 'Folder', color: '#2EC4B6' },
  { id: 'shopping', name: 'Shopping & Finds', icon: 'Folder', color: '#FE2C55' },
  { id: 'tech', name: 'Tech & Hacks', icon: 'Folder', color: '#A855F7' },
  { id: 'home', name: 'Home & DIY', icon: 'Folder', color: '#FBBF24' },
  { id: 'beauty', name: 'Beauty & Style', icon: 'Folder', color: '#F472B6' },
  { id: 'pets', name: 'Pets & Animals', icon: 'Folder', color: '#C4B5FD' },
  { id: 'learning', name: 'Learning & Tips', icon: 'Folder', color: '#38BDF8' },
  { id: 'comedy', name: 'Comedy & Fun', icon: 'Folder', color: '#FACC15' },
  { id: 'music', name: 'Music & Dance', icon: 'Folder', color: '#E879F9' },
  { id: 'business', name: 'Business & Ideas', icon: 'Folder', color: '#34D399' },
  { id: 'gaming', name: 'Gaming', icon: 'Folder', color: '#818CF8' },
  { id: 'family', name: 'Family & Parenting', icon: 'Folder', color: '#FDBA74' },
  { id: 'art', name: 'Art & Crafts', icon: 'Folder', color: '#67E8F9' }
];
export const EMPTY_PROFILE: VaultProfile = { name: '', source: '', purpose: '', frequency: '', organization: '', watchStyle: '', categoryIds: [] };
const questions = [
  { title: 'What should we call you?', hint: 'A first name or nickname is perfect.', key: 'name' },
  { title: 'How did you hear about TokVault?', hint: 'We’d love to know how you found us.', key: 'source', options: ['TikTok', 'Instagram', 'Facebook', 'App Store', 'Friend or family', 'Other'] },
  { title: 'What brings you here?', hint: 'Pick your main reason for saving videos.', key: 'purpose', options: ['Try ideas later', 'Learn something new', 'Plan projects or trips', 'Keep my favorite videos', 'A bit of everything'] },
  { title: 'How often do you save videos?', hint: 'There’s no right answer.', key: 'frequency', options: ['Every day', 'A few times a week', 'Now and then', 'I’m just getting started'] },
  { title: 'How do you like to stay organized?', hint: 'Your library supports all of these.', key: 'organization', options: ['Browse categories', 'Search by keyword', 'Use favorites', 'Add notes and tags'] },
  { title: 'When do you come back to saved videos?', hint: 'Tell us a little about your routine.', key: 'watchStyle', options: ['When I need an idea', 'During a quiet break', 'When I’m ready to try it', 'Whenever I remember'] },
  { title: 'What are you into?', hint: 'Choose up to 5 categories for your scrolling bar. Change them anytime in Settings.', key: 'categoryIds' }
];
export default function Onboarding({ initial, onComplete, onClose }: { initial: VaultProfile | null; onComplete: (profile: VaultProfile) => void; onClose: () => void }) {
  const [profile, setProfile] = useState<VaultProfile>(initial || EMPTY_PROFILE);
  const [step, setStep] = useState(0);
  const question = questions[step];
  const finish = () => onComplete(profile);
  return <div className="fixed inset-0 z-[60] bg-[#0B0C10] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <div className="max-w-lg mx-auto px-5 py-6 min-h-full flex flex-col" style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between mb-8"><span className="font-bold flex gap-2 items-center"><Sparkles className="text-[#25F4EE] w-5 h-5" />Make TokVault yours</span><button aria-label="Close onboarding" onClick={onClose} className="p-2 text-slate-400"><X className="w-5 h-5" /></button></div>
      <div className="flex gap-1.5 mb-5" aria-label={`Step ${step + 1} of 7`}>{questions.map((_, i) => <span key={i} className={`h-1 rounded-full flex-1 ${i <= step ? 'bg-[#25F4EE]' : 'bg-[#252836]'}`} />)}</div>
      <p className="text-xs uppercase tracking-wider text-[#25F4EE] mb-3">Step {step + 1} of 7 · Optional</p>
      <h1 id="onboarding-title" className="text-3xl font-bold leading-tight mb-3">{question.title}</h1><p className="text-sm text-slate-400 mb-6">{question.hint}</p>
      <div className="flex-1">
        {step === 0 ? <label className="block text-sm text-slate-300">Your name<input maxLength={50} autoComplete="given-name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="First name or nickname" className="mt-2 w-full bg-[#171A24] border border-[#34394C] rounded-xl p-4 text-base text-white focus:outline-none focus:border-[#25F4EE]" /></label>
        : step === 6 ? <><p aria-live="polite" className="text-sm text-slate-400 mb-3">{profile.categoryIds.length} of 5 selected</p><div className="grid grid-cols-2 gap-2">{CATEGORY_OPTIONS.map(c => { const selected = profile.categoryIds.includes(c.id); return <button key={c.id} aria-pressed={selected} disabled={!selected && profile.categoryIds.length >= 5} onClick={() => setProfile({ ...profile, categoryIds: selected ? profile.categoryIds.filter(id => id !== c.id) : [...profile.categoryIds, c.id] })} className={`min-h-[58px] p-3 text-sm rounded-xl border text-left flex items-center gap-2 disabled:opacity-40 ${selected ? 'border-[#25F4EE] bg-[#25F4EE]/10 text-white' : 'border-[#2B3042] bg-[#171A24] text-slate-300'}`}><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />{c.name}{selected && <Check className="w-4 h-4 ml-auto shrink-0 text-[#25F4EE]" />}</button>; })}</div></>
        : <div className="space-y-2">{question.options?.map(option => { const selected = profile[question.key as keyof VaultProfile] === option; return <button key={option} aria-pressed={selected} onClick={() => setProfile({ ...profile, [question.key]: option })} className={`w-full p-4 text-left rounded-xl border flex items-center justify-between ${selected ? 'border-[#25F4EE] bg-[#25F4EE]/10 text-white' : 'border-[#2B3042] bg-[#171A24] text-slate-300'}`}>{option}{selected && <Check className="w-4 h-4 text-[#25F4EE]" />}</button>; })}</div>}
      </div>
      <div className="flex gap-3 mt-8"><button disabled={step === 0} onClick={() => setStep(step - 1)} className="p-4 rounded-xl bg-[#171A24] disabled:opacity-30" aria-label="Previous question"><ChevronLeft className="w-5 h-5" /></button><button onClick={() => step === 6 ? finish() : setStep(step + 1)} className="flex-1 py-4 rounded-xl bg-[#FE2C55] text-white font-bold flex items-center justify-center gap-2">{step === 6 ? 'Open my vault' : 'Continue'}<ChevronRight className="w-5 h-5" /></button></div>
      <button onClick={() => step === 6 ? onComplete({ ...profile, categoryIds: [] }) : setStep(step + 1)} className="text-sm text-slate-400 py-4">{step === 6 ? 'Use default categories' : 'Skip this question'}</button>
      <p className="text-xs text-slate-500 text-center">Your answers stay on this device. No account needed.</p>
    </div>
  </div>;
}
