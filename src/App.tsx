import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bookmark,
  Search,
  Plus,
  Play,
  Heart,
  Folder,
  Tag,
  Trash2,
  ExternalLink,
  Download,
  Upload,
  Smartphone,
  Sparkles,
  Check,
  X,
  Edit3,
  Clipboard,
  Loader2,
  FolderPlus,
  SlidersHorizontal,
  Video,
  Share2,
  UserRound,
  Clock,
  Settings,
  Crown,
  ShieldCheck
} from 'lucide-react';
import CloudBackup from './CloudBackup';
import Discover from './Discover';
import { sameVideo, mergeLibraries } from './services/library';
import AuthScreen from './AuthScreen';
import ShareLink from './ShareLink';
import Paywall, { SubscriptionState, PAYWALL_PLANS, PlanId } from './Paywall';
import AdminModal from './AdminModal';
import {
  isAdminEmail,
  getActiveAdminEmail,
  setActiveAdminEmail,
  parseVipGrantToken
} from './services/adminAccess';
import { authClient } from './services/auth';
import type { Session } from '@supabase/supabase-js';
import Onboarding, { VaultProfile, CATEGORY_OPTIONS } from './Onboarding';
import { SavedTikTok, CollectionFolder, VaultBackup } from './types';
import {
  DEFAULT_COLLECTIONS,
  SAMPLE_TIKTOKS,
  extractTikTokUrl,
  parseTikTokUrlParts,
  fetchTikTokMetadata
} from './services/tiktokService';

const STORAGE_ITEMS_KEY = 'tokvault_saved_items_v1';
const STORAGE_COLLECTIONS_KEY = 'tokvault_collections_v1';
const STORAGE_SUBSCRIPTION_KEY = 'tokvault_subscription_v1';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!authClient);
  const [showAuth, setShowAuth] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [bulkShare, setBulkShare] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletedItems, setDeletedItems] = useState<SavedTikTok[]>([]);
  const [watchedFilter, setWatchedFilter] = useState<'all' | 'unwatched' | 'watched'>('all');
  const saveLock = useRef(false);
  const [sharingItem, setSharingItem] = useState<SavedTikTok | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionState | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SUBSCRIPTION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SubscriptionState;
      // Only treat verified Stripe/App Store/Play Store subscriptions as active
      if (!parsed.provider || parsed.provider === 'local') {
        localStorage.removeItem(STORAGE_SUBSCRIPTION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [showPaywallPreview, setShowPaywallPreview] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const isAdmin =
    isAdminEmail(session?.user.email) ||
    subscription?.provider === 'admin' ||
    isAdminEmail(getActiveAdminEmail());

  useEffect(() => {
    if (!authClient) return;
    let mounted = true;
    const { data: { subscription: authSub } } = authClient.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      setSession(next); setAuthReady(true);
      if (next?.user.email && isAdminEmail(next.user.email)) {
        setActiveAdminEmail(next.user.email);
        const now = new Date();
        const adminSub: SubscriptionState = {
          active: true,
          planId: 'yearly',
          trialDays: 3650,
          startedAt: now.toISOString(),
          trialEndsAt: new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
          priceLabel: `Unlimited Admin Access (${next.user.email})`,
          provider: 'admin',
          vipEmail: next.user.email
        };
        setSubscription(adminSub);
        localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(adminSub));
      }
      if (event === 'PASSWORD_RECOVERY') { setPasswordRecovery(true); setShowAuth(true); }
      else if (next && event === 'SIGNED_IN') setShowAuth(false);
    });
    authClient.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthReady(true);
        if (data.session?.user.email && isAdminEmail(data.session.user.email)) {
          setActiveAdminEmail(data.session.user.email);
        }
        if (data.session && !window.location.hash.includes('type=recovery')) setShowAuth(false);
      }
    });
    return () => { mounted = false; authSub.unsubscribe(); };
  }, []);
  const [profile, setProfile] = useState<VaultProfile | null>(() => {
    try { return JSON.parse(localStorage.getItem('tokvault_profile_v1') || 'null'); } catch { return null; }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('tokvault_onboarding_done_v1'));
  const completeOnboarding = (next: VaultProfile) => {
    setProfile(next);
    localStorage.setItem('tokvault_profile_v1', JSON.stringify(next));
    localStorage.setItem('tokvault_onboarding_done_v1', 'true');
    setCollections(previous => [...previous, ...CATEGORY_OPTIONS.filter(c => next.categoryIds.includes(c.id) && !previous.some(p => p.id === c.id))]);
    setShowOnboarding(false);
    setActiveFilter('all');
    setActiveTag(null);
  };

  const handleStartTrial = (sub: SubscriptionState) => {
    setSubscription(sub);
    localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(sub));
    setShowPaywallPreview(false);
    setSaveFeedback({
      type: 'success',
      message: `${sub.trialDays}-Day Free Trial activated (${sub.priceLabel})!`
    });
    setTimeout(() => setSaveFeedback(null), 5000);
  };

  const handleRestorePurchases = (): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_SUBSCRIPTION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SubscriptionState;
        if (parsed?.active) {
          setSubscription(parsed);
          setShowPaywallPreview(false);
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  };
  // Persisted State
  const [items, setItems] = useState<SavedTikTok[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ITEMS_KEY);
      if (raw) return JSON.parse(raw).map((item: SavedTikTok) => item.metadataStatus === 'loading' ? { ...item, metadataStatus: 'unavailable' } : item);
    } catch (e) {
      console.error('Failed to read items from localStorage', e);
    }
    return SAMPLE_TIKTOKS;
  });

  const [collections, setCollections] = useState<CollectionFolder[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_COLLECTIONS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read collections from localStorage', e);
    }
    return DEFAULT_COLLECTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COLLECTIONS_KEY, JSON.stringify(collections));
    } catch (e) {
      console.error('Failed to save collections', e);
    }
  }, [collections]);

  // Quick Save Input State
  const [urlInput, setUrlInput] = useState('');
  const [selectedCollectionForSave, setSelectedCollectionForSave] = useState<string>('watch-later');
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [quickTagsInput, setQuickTagsInput] = useState('');
  const [showAdvancedSave, setShowAdvancedSave] = useState(false);
  const isSaving = false;
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all'); // 'all' | 'favorites' | collection.id
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'creator'>('newest');

  // Modals State
  const [playingItem, setPlayingItem] = useState<SavedTikTok | null>(null);
  const [editingItem, setEditingItem] = useState<SavedTikTok | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#FE2C55');
  const [showMobileGuideModal, setShowMobileGuideModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Support PWA Web Share Target + Stripe Checkout Return + Admin VIP Invite Links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const vipGrantParam = params.get('vip_grant');
    if (vipGrantParam) {
      const parsedGrant = parseVipGrantToken(vipGrantParam);
      if (parsedGrant) {
        const now = new Date();
        const vipSub: SubscriptionState = {
          active: true,
          planId: 'yearly',
          trialDays: 3650,
          startedAt: now.toISOString(),
          trialEndsAt: new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
          priceLabel: `Unlimited VIP Access (${parsedGrant.email})`,
          provider: isAdminEmail(parsedGrant.email) ? 'admin' : 'vip',
          vipEmail: parsedGrant.email
        };
        setSubscription(vipSub);
        localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(vipSub));
        localStorage.setItem('tokvault_onboarding_done_v1', 'true');
        setShowOnboarding(false);
        setShowPaywallPreview(false);
        setSaveFeedback({
          type: 'success',
          message: `Unlimited VIP Access unlocked for ${parsedGrant.email}!`
        });
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    }

    if (params.get('stripe_success') === '1') {
      const planParam = (params.get('plan') || localStorage.getItem('tokvault_pending_plan_v1') || 'yearly') as PlanId;
      const matchedPlan = PAYWALL_PLANS.find((p) => p.id === planParam) || PAYWALL_PLANS[0];
      const now = new Date();
      const trialEnd = new Date(now.getTime() + matchedPlan.trialDays * 24 * 60 * 60 * 1000);
      const stripeSub: SubscriptionState = {
        active: true,
        planId: matchedPlan.id,
        trialDays: matchedPlan.trialDays,
        startedAt: now.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        priceLabel: matchedPlan.priceLabel,
        provider: 'stripe'
      };
      setSubscription(stripeSub);
      localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(stripeSub));
      localStorage.setItem('tokvault_onboarding_done_v1', 'true');
      setShowOnboarding(false);
      setShowPaywallPreview(false);
      setSaveFeedback({
        type: 'success',
        message: `Stripe 3-Day Free Trial activated (${matchedPlan.name} — ${matchedPlan.priceLabel})!`
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const sharedUrl = params.get('url') || params.get('text') || params.get('title');
    if (sharedUrl) {
      const extracted = extractTikTokUrl(sharedUrl);
      if (extracted) {
        setUrlInput(extracted);
        setShowAdvancedSave(true);
        // Clean URL bar without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const enrichItem = async (id: string, url: string) => {
    try {
      const metadata = await fetchTikTokMetadata(url);
      setItems(previous => {
        const current = previous.find(x => x.id === id);
        if (!current) return previous;
        const duplicate = previous.find(x => x.id !== id && sameVideo(x, metadata));
        if (duplicate) {
          setSaveFeedback({ type: 'success', message: 'This video was already saved. Kept one copy and combined your notes and tags.' });
          return previous.filter(x => x.id !== id).map(x => x.id === duplicate.id ? { ...x, tags: [...new Set([...x.tags, ...current.tags])], notes: [...new Set([x.notes, current.notes].filter(Boolean))].join('\n'), isFavorite: x.isFavorite || current.isFavorite } : x);
        }
        return previous.map(x => x.id === id ? { ...x, ...metadata, originalUrl: x.originalUrl || url, title: x.title.startsWith('Saved TikTok') ? metadata.title : x.title, tags: [...new Set([...x.tags, ...metadata.tags])], metadataStatus: metadata.title.startsWith('Saved TikTok') ? 'unavailable' : 'ready' } : x);
      });
    } catch {
      setItems(previous => previous.map(x => x.id === id ? { ...x, metadataStatus: 'unavailable' } : x));
    }
  };
  const handleSaveTikTok = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saveLock.current) return;
    const extracted = extractTikTokUrl(urlInput);
    if (!extracted) { setSaveFeedback({ type: 'error', message: 'Paste a valid TikTok link to save it.' }); return; }
    const duplicate = items.find(x => sameVideo(x, { url: extracted }));
    if (duplicate) { setPlayingItem(duplicate); setSaveFeedback({ type: 'success', message: 'Already saved! Here is your existing video.' }); return; }
    saveLock.current = true;
    const parts = parseTikTokUrlParts(extracted);
    const newItem: SavedTikTok = {
      id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: extracted, originalUrl: extracted, videoId: parts.videoId,
      embedUrl: parts.videoId ? `https://www.tiktok.com/player/v1/${parts.videoId}` : undefined,
      title: `Saved TikTok${parts.handle ? ` from ${parts.handle}` : ' link'}`,
      authorName: parts.handle?.slice(1) || 'TikTok Creator', authorHandle: parts.handle || '@tiktok_creator',
      collectionId: selectedCollectionForSave, tags: quickTagsInput.split(/[,#\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean),
      notes: quickNoteInput.trim(), isFavorite: false, isWatched: false, metadataStatus: 'loading', createdAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify([newItem, ...items]));
      setItems(previous => [newItem, ...previous]); setUrlInput(''); setQuickNoteInput(''); setQuickTagsInput(''); setShowAdvancedSave(false);
      setSaveFeedback({ type: 'success', message: 'Link saved. Preview details are loading in the background.' });
      void enrichItem(newItem.id, extracted);
    } catch { setSaveFeedback({ type: 'error', message: 'Could not save on this device. Export a backup and free up storage, then try again.' }); }
    finally { saveLock.current = false; }
  };

  // Paste from Clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const clean = extractTikTokUrl(text) || text;
        setUrlInput(clean);
      }
    } catch {
      setSaveFeedback({
        type: 'error',
        message: 'Press and hold inside the URL box and choose Paste. On a computer, use Cmd+V or Ctrl+V.'
      });
    }
  };

  // Toggle favorite
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  // Delete item
  const deleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (playingItem?.id === id) setPlayingItem(null);
    if (editingItem?.id === id) setEditingItem(null);
  };

  // Create collection folder
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const id = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;
    const newFolder: CollectionFolder = {
      id,
      name: trimmed,
      icon: 'Folder',
      color: newFolderColor
    };
    setCollections((prev) => [...prev, newFolder]);
    setSelectedCollectionForSave(id);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  // Delete custom collection
  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollections((prev) => prev.filter((c) => c.id !== folderId));
    if (activeFilter === folderId) setActiveFilter('all');
  };

  // Computed Tags List with counts
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      item.tags.forEach((t) => {
        const clean = t.toLowerCase();
        counts.set(clean, (counts.get(clean) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [items]);

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items
      .filter((item) => {
        if (watchedFilter === 'watched' && !item.isWatched) return false;
        if ((watchedFilter === 'unwatched' || activeFilter === 'watch-later') && item.isWatched) return false;
        if (activeFilter === 'favorites' && !item.isFavorite) return false;
        if (activeFilter !== 'all' && activeFilter !== 'favorites' && item.collectionId !== activeFilter) {
          return false;
        }
        if (activeTag && !item.tags.map((t) => t.toLowerCase()).includes(activeTag.toLowerCase())) {
          return false;
        }
        if (!q) return true;

        const inTitle = item.title.toLowerCase().includes(q);
        const inAuthor =
          item.authorName.toLowerCase().includes(q) || item.authorHandle.toLowerCase().includes(q);
        const inNotes = item.notes.toLowerCase().includes(q);
        const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const inFolder =
          collections
            .find((c) => c.id === item.collectionId)
            ?.name.toLowerCase()
            .includes(q) || false;

        return inTitle || inAuthor || inNotes || inTags || inFolder;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return a.authorHandle.localeCompare(b.authorHandle);
      });
  }, [items, searchQuery, activeFilter, activeTag, sortBy, collections, watchedFilter]);

  // Export JSON Backup
  const handleExportBackup = () => {
    const backup: VaultBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: profile || undefined,
      collections,
      items
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result)) as Partial<VaultBackup>;
        if (parsed.profile && Array.isArray(parsed.profile.categoryIds)) {
          const restoredProfile = { ...parsed.profile, categoryIds: parsed.profile.categoryIds.filter(id => typeof id === 'string').slice(0, 5) };
          setProfile(restoredProfile);
          localStorage.setItem('tokvault_profile_v1', JSON.stringify(restoredProfile));
          localStorage.setItem('tokvault_onboarding_done_v1', 'true');
          setShowOnboarding(false);
        }
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
        }
        if (Array.isArray(parsed.collections)) {
          setCollections(parsed.collections);
        }
        setShowBackupModal(false);
        setSaveFeedback({
          type: 'success',
          message: `Imported ${parsed.items?.length || 0} saved TikToks!`
        });
        setTimeout(() => setSaveFeedback(null), 4000);
      } catch {
        setSaveFeedback({
          type: 'error',
          message: 'Invalid JSON backup file.'
        });
      }
    };
    reader.readAsText(file);
  };

  const getCollectionForItem = (collectionId: string) =>
    collections.find((c) => c.id === collectionId) || {
      id: 'uncategorized',
      name: 'General',
      color: '#64748B',
      icon: 'Folder'
    };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0B0C10] text-slate-100">
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-[#252836] bg-[#101218] p-5 shrink-0 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FE2C55] via-[#FF5E7E] to-[#25F4EE] p-[2px] shadow-lg shadow-[#FE2C55]/20">
            <div className="w-full h-full bg-[#0B0C10] rounded-[10px] flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-[#25F4EE] fill-[#FE2C55]" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight flex items-center gap-1.5">
              TokVault
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FE2C55]/15 text-[#FE2C55] border border-[#FE2C55]/30">
                Web + Mobile
              </span>
            </h1>
            <p className="text-xs text-slate-400">Save, organize & search TikToks</p>
          </div>
        </div>

        {/* Primary Library Filters */}
        <div className="space-y-1 mb-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Library
          </p>
          <button
            onClick={() => {
              setActiveFilter('all');
              setActiveTag(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeFilter === 'all'
                ? 'bg-gradient-to-r from-[#FE2C55]/20 to-[#25F4EE]/10 text-white border border-[#FE2C55]/40'
                : 'text-slate-400 hover:bg-[#191C26] hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-[#25F4EE]" />
              All Saved Videos
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E2230] text-slate-300">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('favorites');
              setActiveTag(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeFilter === 'favorites'
                ? 'bg-gradient-to-r from-[#FE2C55]/20 to-[#25F4EE]/10 text-white border border-[#FE2C55]/40'
                : 'text-slate-400 hover:bg-[#191C26] hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-[#FE2C55]" />
              Favorites
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E2230] text-slate-300">
              {items.filter((i) => i.isFavorite).length}
            </span>
          </button>
        </div>

        {/* Collections / Folders */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Collections
            </span>
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="text-xs text-[#25F4EE] hover:underline flex items-center gap-1"
              title="New Collection"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          {collections.map((folder) => {
            const count = items.filter((i) => i.collectionId === folder.id).length;
            const isActive = activeFilter === folder.id;
            return (
              <div
                key={folder.id}
                onClick={() => {
                  setActiveFilter(folder.id);
                  setActiveTag(null);
                }}
                className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition ${
                  isActive
                    ? 'bg-[#1F2330] text-white border border-slate-700'
                    : 'text-slate-400 hover:bg-[#191C26] hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="truncate">{folder.name}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">{count}</span>
                  {!DEFAULT_COLLECTIONS.some((d) => d.id === folder.id) && (
                    <button
                      onClick={(e) => handleDeleteFolder(folder.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5"
                      title="Delete collection"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions (Admin, Paywall, Account, iOS/Android App Guide + Backup) */}
        <div className="pt-4 mt-4 border-t border-[#252836] space-y-2">
          {isAdmin && (
            <button
              onClick={() => setShowAdminModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 transition"
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Admin Panel (Grant Access)</span>
              </span>
            </button>
          )}

          <button
            onClick={() => setShowPaywallPreview(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#FE2C55]/20 to-[#8B5CF6]/20 hover:from-[#FE2C55]/30 hover:to-[#8B5CF6]/30 text-white border border-[#FE2C55]/40 transition"
          >
            <span className="flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>
                {subscription?.provider === 'admin'
                  ? 'Unlimited Admin Access'
                  : subscription?.provider === 'vip'
                  ? 'Unlimited VIP Access'
                  : subscription?.active
                  ? 'TokVault Pro (Active)'
                  : 'Start 3-Day Free Trial'}
              </span>
            </span>
          </button>

          <button
            onClick={() => setShowAuth(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium bg-[#181B24] hover:bg-[#222634] text-slate-200 border border-[#252836] transition"
          >
            <span className="flex items-center gap-2.5 truncate">
              <UserRound className="w-4 h-4 text-[#25F4EE] shrink-0" />
              <span className="truncate">{session?.user.email || 'Account Sign-In'}</span>
            </span>
            {session && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
          </button>

          <button
            onClick={() => setShowBackupModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-[#181B24] hover:bg-[#222634] text-slate-200 border border-[#252836] transition"
          >
            <Download className="w-4 h-4 text-[#FE2C55]" />
            <span>Cloud & JSON Backup</span>
          </button>

          <button
            onClick={() => setShowMobileGuideModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-[#181B24] hover:bg-[#222634] text-slate-200 border border-[#252836] transition"
          >
            <Smartphone className="w-4 h-4 text-[#25F4EE]" />
            <span>iOS & Android Setup</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-8">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3.5 border-b border-[#252836] bg-[#101218]/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] p-[1.5px]">
              <div className="w-full h-full bg-[#0B0C10] rounded-[6.5px] flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-[#25F4EE] fill-[#FE2C55]" />
              </div>
            </div>
            <span className="font-bold text-base">TokVault</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                aria-label="Admin Access Manager"
                className="p-2 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300"
                title="Admin Access Manager"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowPaywallPreview(true)}
              aria-label="TokVault Pro Plans"
              className="p-2 rounded-lg bg-[#FE2C55]/20 border border-[#FE2C55]/40 text-amber-300"
              title="TokVault Pro Plans"
            >
              <Crown className="w-4 h-4 fill-amber-300" />
            </button>
            <button onClick={() => setShowAuth(true)} aria-label="Account sign-in" className="p-2 rounded-lg bg-[#181B24] border border-[#252836]"><UserRound className="w-4 h-4 text-[#25F4EE]" /></button>
            <button
              onClick={() => setShowBackupModal(true)}
              className="p-2 rounded-lg bg-[#181B24] text-slate-300 border border-[#252836]"
              title="Cloud & JSON Backup"
            >
              <Download className="w-4 h-4 text-[#FE2C55]" />
            </button>
          </div>
        </header>

        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">
          {/* QUICK SAVE TIKTOK BAR */}
          <section className="rounded-2xl bg-gradient-to-b from-[#171A24] to-[#12151E] border border-[#272B3A] p-4 sm:p-5 shadow-xl">
            <form onSubmit={handleSaveTikTok} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#25F4EE] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FE2C55]" />
                  Save a TikTok Link
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSave(!showAdvancedSave)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {showAdvancedSave ? 'Hide options' : '+ Add note / tags'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste TikTok link (e.g. https://www.tiktok.com/@user/video/... or https://www.tiktok.com/t/...)"
                    className="w-full pl-4 pr-20 py-3 rounded-xl bg-[#0B0C10] border border-[#2B3042] focus:border-[#25F4EE] focus:outline-none text-sm text-white placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="absolute right-2 px-2.5 py-1.5 rounded-lg bg-[#1A1D28] hover:bg-[#252A3A] text-xs font-medium text-slate-300 flex items-center gap-1 border border-[#2E3346] transition"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-[#25F4EE]" />
                    Paste
                  </button>
                </div>

                <select
                  value={selectedCollectionForSave}
                  onChange={(e) => setSelectedCollectionForSave(e.target.value)}
                  className="px-3.5 py-3 rounded-xl bg-[#0B0C10] border border-[#2B3042] text-sm text-slate-200 focus:border-[#25F4EE] focus:outline-none"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      📁 {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#FE2C55] to-[#E01E45] hover:from-[#FF3B63] hover:to-[#FE2C55] text-white shadow-lg shadow-[#FE2C55]/25 flex items-center justify-center gap-2 transition disabled:opacity-60 shrink-0 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Save TikTok
                    </>
                  )}
                </button>
              </div>

              {/* Optional Note & Custom Tags drawer before saving */}
              {showAdvancedSave && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#232736]">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Personal Note (Why are you saving this?)
                    </label>
                    <input
                      type="text"
                      value={quickNoteInput}
                      onChange={(e) => setQuickNoteInput(e.target.value)}
                      placeholder="e.g., Make this pasta for dinner on Friday, substitute spinach..."
                      className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-[#2B3042] text-xs text-white focus:border-[#25F4EE] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Extra Search Tags (comma or space separated — #hashtags are auto-extracted too)
                    </label>
                    <input
                      type="text"
                      value={quickTagsInput}
                      onChange={(e) => setQuickTagsInput(e.target.value)}
                      placeholder="e.g., pasta, weeknight, italian, must-try"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-[#2B3042] text-xs text-white focus:border-[#25F4EE] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Feedback Toast */}
              {saveFeedback && (
                <div
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium ${
                    saveFeedback.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {saveFeedback.message}
                  </span>
                  <button type="button" onClick={() => setSaveFeedback(null)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* SEARCH, MOBILE COLLECTION PILLS & TAG FILTER BAR */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Instant Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by keyword, caption, @creator, #tag, or your personal notes..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#14161D] border border-[#252836] focus:border-[#25F4EE] focus:outline-none text-sm text-white placeholder-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'creator')}
                  className="px-3.5 py-2.5 rounded-xl bg-[#14161D] border border-[#252836] text-xs font-medium text-slate-300 focus:outline-none"
                >
                  <option value="newest">Sort: Newest Saved</option>
                  <option value="oldest">Sort: Oldest Saved</option>
                  <option value="creator">Sort: Creator (@A–Z)</option>
                </select>
              </div>
            </div>

            {/* Mobile Horizontal Collection Pills */}
            <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {collections.filter((c) => c.id !== 'watch-later' && (!profile?.categoryIds.length || profile.categoryIds.includes(c.id))).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveFilter(c.id); setActiveTag(null); setShowSettings(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border flex items-center gap-1.5 ${
                    activeFilter === c.id
                      ? 'bg-[#1F2433] text-white border-[#25F4EE]'
                      : 'bg-[#14161D] text-slate-400 border-[#252836]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>

            {/* Popular Tags Bar */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1 shrink-0">
                  <Tag className="w-3 h-3" /> Tags:
                </span>
                {activeTag && (
                  <button
                    onClick={() => setActiveTag(null)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 flex items-center gap-1"
                  >
                    Clear #{activeTag} <X className="w-3 h-3" />
                  </button>
                )}
                {allTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
                      activeTag === tag
                        ? 'bg-[#25F4EE]/20 text-[#25F4EE] border border-[#25F4EE]/40'
                        : 'bg-[#14161D] hover:bg-[#1C202B] text-slate-400 border border-[#252836]'
                    }`}
                  >
                    #{tag} <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowDiscover(true)} className="px-4 py-2 rounded-xl bg-[#25F4EE]/10 text-[#25F4EE] text-sm">Discover</button>
            <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds([]); }} className="px-4 py-2 rounded-xl bg-[#1E2230] text-sm">{bulkMode ? 'Done selecting' : 'Select videos'}</button>
            <select aria-label="Watched status" value={watchedFilter} onChange={e => { setWatchedFilter(e.target.value as typeof watchedFilter); if (activeFilter === 'watch-later' && e.target.value === 'watched') setActiveFilter('all'); }} className="p-2 rounded-xl bg-[#1E2230] text-sm"><option value="all">Any watch status</option><option value="unwatched">Unwatched</option><option value="watched">Watched</option></select>
          </div>
          {bulkMode && <div className="rounded-xl border border-[#34394C] p-3 flex flex-wrap gap-2 text-sm"><span className="w-full text-slate-400">{selectedIds.length} selected</span>
            <button onClick={() => setSelectedIds(filteredItems.map(x => x.id))} className="p-2 bg-[#1E2230] rounded-lg">Select visible</button>
            <button disabled={!selectedIds.length} onClick={() => setItems(prev => prev.map(x => selectedIds.includes(x.id) ? { ...x, isFavorite: true } : x))} className="p-2 bg-[#1E2230] rounded-lg disabled:opacity-40">Favorite selected</button>
            <button disabled={!selectedIds.length} onClick={() => setItems(prev => prev.map(x => selectedIds.includes(x.id) ? { ...x, isWatched: true } : x))} className="p-2 bg-[#1E2230] rounded-lg disabled:opacity-40">Mark watched</button>
            <select aria-label="Move selected videos" disabled={!selectedIds.length} value="" onChange={e => { const id = e.target.value; if (id) setItems(prev => prev.map(x => selectedIds.includes(x.id) ? { ...x, collectionId: id } : x)); }} className="p-2 bg-[#1E2230] rounded-lg disabled:opacity-40"><option value="">Move to…</option>{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button disabled={!selectedIds.length} onClick={() => setBulkShare(items.filter(x => selectedIds.includes(x.id)).map(x => x.url).join('\n'))} className="p-2 bg-[#1E2230] rounded-lg disabled:opacity-40">Share selected</button>
            <button disabled={!selectedIds.length} onClick={() => { setDeletedItems(items.filter(x => selectedIds.includes(x.id))); setItems(prev => prev.filter(x => !selectedIds.includes(x.id))); setSelectedIds([]); }} className="p-2 bg-rose-500/20 rounded-lg disabled:opacity-40">Delete selected</button>
          </div>}
          {deletedItems.length > 0 && <div role="status" className="p-3 rounded-xl bg-[#1E2230] text-sm">{deletedItems.length} videos deleted. <button onClick={() => { setItems(prev => mergeLibraries(prev, deletedItems)); setDeletedItems([]); }} className="text-[#25F4EE] p-2">Undo delete</button></div>}
          {/* SAVED TIKTOK VIDEO GRID */}
          <section>
            {filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#252836] bg-[#12141C]/50 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#191C26] flex items-center justify-center mx-auto text-slate-400">
                  <Bookmark className="w-6 h-6 text-[#FE2C55]" />
                </div>
                <h3 className="text-base font-semibold text-white">No matching TikToks found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {searchQuery || activeTag || activeFilter !== 'all'
                    ? 'Try clearing your search filter or switching back to "All Saved Videos".'
                    : 'Paste any TikTok video URL above to automatically save its caption, creator, tags, and embedded video player.'}
                </p>
                {(searchQuery || activeTag || activeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTag(null);
                      setActiveFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-[#1E2230] hover:bg-[#272C3F] text-[#25F4EE]"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const folder = getCollectionForItem(item.collectionId);
                  return (
                    <article
                      key={item.id}
                      onClick={() => setPlayingItem(item)}
                      className="group rounded-2xl bg-[#14161D] border border-[#252836] hover:border-[#383D52] overflow-hidden flex flex-col justify-between transition shadow-lg hover:shadow-xl cursor-pointer"
                    >
                      <div>
                        {/* Card Media Header */}
                        <div className="relative h-44 bg-gradient-to-br from-[#1E2230] via-[#151822] to-[#0B0C10] overflow-hidden">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500 opacity-85"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#14161D] via-black/30 to-transparent" />

                          {/* Top Left Collection Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-medium">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: folder.color }}
                            />
                            <span>{folder.name}</span>
                          </div>

                          {/* Top Right Quick Actions */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              className={`p-2 rounded-full backdrop-blur-md border transition ${
                                item.isFavorite
                                  ? 'bg-[#FE2C55] text-white border-[#FE2C55]'
                                  : 'bg-black/60 text-slate-300 border-white/10 hover:text-white'
                              }`}
                              title="Favorite"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-white' : ''}`}
                              />
                            </button>
                          </div>

                          <button aria-label={`Share ${item.title}`} onClick={e => { e.stopPropagation(); setSharingItem(item); }} className="absolute left-3 top-11 z-10 p-2 rounded-full bg-black/70 text-white border border-white/10"><Share2 className="w-4 h-4" /></button>

                          {bulkMode && <button aria-label={`Select ${item.title}`} aria-pressed={selectedIds.includes(item.id)} onClick={e => { e.stopPropagation(); setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]); }} className="absolute top-3 right-14 z-10 rounded-lg p-2 bg-black/80 border border-[#25F4EE]">{selectedIds.includes(item.id) ? <Check className="w-4 h-4 text-[#25F4EE]" /> : <span className="block w-4 h-4" />}</button>}
                          {item.isWatched && <span className="absolute bottom-12 right-3 rounded-full bg-black/80 px-2 py-1 text-xs text-[#25F4EE]">Watched</span>}
                          {/* Center Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-[#FE2C55]/90 text-white flex items-center justify-center shadow-lg shadow-[#FE2C55]/40 group-hover:scale-110 transition">
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            </div>
                          </div>

                          {/* Creator Handle Bottom Left */}
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white drop-shadow">
                                {item.authorName}
                              </p>
                              <p className="text-[11px] text-[#25F4EE] font-medium">
                                {item.authorHandle}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Caption & Personal Notes */}
                        <div className="p-4 space-y-2.5">
                          <p className="text-sm text-slate-200 font-medium line-clamp-2 leading-snug">
                            {item.title}
                          </p>

                          {item.notes && (
                            <div className="p-2.5 rounded-xl bg-[#1B1E2B] border border-[#2A2F42] text-xs text-amber-200/90">
                              <span className="font-semibold text-amber-400">Note: </span>
                              {item.notes}
                            </div>
                          )}

                          {item.metadataStatus === 'loading' && <p className="text-xs text-slate-400">Link saved · Loading preview…</p>}
                          {(item.metadataStatus === 'unavailable' || (item.metadataStatus === 'loading' && Date.now() - Date.parse(item.createdAt) > 15000)) && <button onClick={e => { e.stopPropagation(); void enrichItem(item.id, item.url); }} className="text-xs text-[#25F4EE] py-2">Link saved · Retry preview details</button>}
                          {/* Tags */}
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.tags.slice(0, 5).map((tag) => (
                                <span
                                  key={tag}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTag(tag);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-[#1D202C] hover:bg-[#272B3B] text-[11px] text-slate-300"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="px-4 py-2.5 border-t border-[#1E212D] flex items-center justify-between text-xs text-slate-500">
                        <button aria-label={item.isWatched ? 'Mark unwatched' : 'Mark watched'} onClick={e => { e.stopPropagation(); setItems(previous => previous.map(x => x.id === item.id ? { ...x, isWatched: !x.isWatched } : x)); }} className="py-2 text-[#25F4EE] flex items-center gap-1"><Check className="w-3.5 h-3.5" />{item.isWatched ? 'Watched' : 'Mark watched'}</button>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button title="Share link" onClick={() => setSharingItem(item)} className="p-2 rounded-lg hover:bg-[#1E2230] text-[#25F4EE]"><Share2 className="w-4 h-4" /></button>
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg hover:bg-[#1E2230] text-slate-400 hover:text-white"
                            title="Edit Note, Folder or Tags"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-[#1E2230] text-slate-400 hover:text-[#25F4EE]"
                            title="Open directly in TikTok"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={(e) => deleteItem(item.id, e)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <nav aria-label="Library navigation" className="fixed bottom-0 inset-x-0 z-40 md:hidden grid grid-cols-4 border-t border-[#2B3042] bg-[#101218] shadow-[0_-4px_20px_rgba(0,0,0,0.25)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[
          { id: 'all', label: 'All', icon: Video },
          { id: 'favorites', label: 'Favorites', icon: Heart },
          { id: 'watch-later', label: 'Watch Later', icon: Clock },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(({ id, label, icon: Icon }) => {
          const selected = id === 'settings' ? showSettings : !showSettings && activeFilter === id;
          return <button key={id} type="button" aria-current={selected ? 'page' : undefined}
            onClick={() => { setShowSettings(id === 'settings'); if (id !== 'settings') { setActiveFilter(id); setActiveTag(null); setSearchQuery(''); setWatchedFilter('all'); } }}
            className={`min-h-[72px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${selected ? 'text-[#25F4EE] bg-[#25F4EE]/5' : 'text-slate-400'}`}>
            <Icon className="w-5 h-5" /><span>{label}</span>
          </button>;
        })}
      </nav>

      {showSettings && (
        <section aria-label="Settings" className="fixed inset-x-0 top-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 overflow-y-auto bg-[#0B0C10] px-5 pt-8 pb-8 md:inset-0 md:z-50 md:max-w-lg md:m-auto md:max-h-[90vh] md:rounded-2xl md:border md:border-[#252836] md:p-6">
          <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">Settings</h2><button aria-label="Close settings" onClick={() => setShowSettings(false)} className="p-3"><X className="w-5 h-5" /></button></div>
          <p className="text-sm text-slate-400 mb-6">{profile?.name ? `Hi ${profile.name}, manage your subscription, cloud backup, and categories.` : 'Manage your subscription, cloud backup, and categories.'}</p>
          <div className="space-y-3">
            {/* Subscription & Paywall Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#FE2C55]/15 to-[#8B5CF6]/15 border border-[#FE2C55]/30 text-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold flex items-center gap-2 text-white">
                  <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                  TokVault Pro Subscription
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  {subscription?.active ? `${subscription.trialDays}-Day Free Trial` : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                {subscription?.active
                  ? `Selected plan: ${subscription.priceLabel} (Trial ends ${new Date(subscription.trialEndsAt).toLocaleDateString()})`
                  : 'Start your 3-day free trial ($3.99/wk, $9.99/mo, $49.99/6 mo, or $99.99/yr).'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowPaywallPreview(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FE2C55] text-white text-xs font-semibold"
                >
                  View Plans / Change Tier
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowAdminModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Panel (Grant Access)
                  </button>
                )}
                <button
                  onClick={() => {
                    localStorage.removeItem('tokvault_onboarding_done_v1');
                    localStorage.removeItem(STORAGE_SUBSCRIPTION_KEY);
                    setSubscription(null);
                    setShowSettings(false);
                    setShowOnboarding(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1E2230] text-slate-200 text-xs font-medium border border-[#2E344A]"
                >
                  Replay Onboarding → Hard Paywall
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#181B24] border border-[#282D3E] text-sm">
              <p className="font-semibold mb-1">Account (Supabase Email / Password)</p>
              <p className="text-xs text-slate-400 mb-3">{session?.user.email || 'Using this device without an account'}</p>
              {session ? (
                <button
                  onClick={async () => {
                    const result = await authClient?.auth.signOut();
                    if (result?.error) {
                      setSaveFeedback({ type: 'error', message: 'Could not sign out. Please try again.' });
                      return;
                    }
                    setSession(null);
                    sessionStorage.removeItem('tokvault_guest_v1');
                    setShowAuth(true);
                  }}
                  className="text-xs font-semibold text-rose-400 hover:underline"
                >
                  Sign out ({session.user.email})
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowAuth(true);
                  }}
                  className="text-xs font-semibold text-[#25F4EE] hover:underline"
                >
                  Sign in or create account with Email & Password
                </button>
              )}
            </div>

            <CloudBackup
              session={session}
              onOpenAuth={() => {
                setShowSettings(false);
                setShowAuth(true);
              }}
              library={{ version: 1, exportedAt: new Date().toISOString(), items, collections, profile: profile || undefined }}
              onRestore={backup => {
                setItems(prev => mergeLibraries(prev, backup.items));
                if (!profile && backup.profile) {
                  setProfile(backup.profile);
                  localStorage.setItem('tokvault_profile_v1', JSON.stringify(backup.profile));
                }
                setCollections(prev => [...prev, ...backup.collections.filter(c => !prev.some(x => x.id === c.id))]);
              }}
            />
            <button onClick={() => setShowDiscover(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><Sparkles className="w-5 h-5 text-[#25F4EE]" />Discover by category</button>
            <button onClick={() => setShowOnboarding(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><Settings className="w-5 h-5 text-[#25F4EE]" />Personalize & Choose Categories</button>
            <button onClick={() => setShowBackupModal(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><Download className="w-5 h-5 text-[#25F4EE]" />Local JSON Backup & Restore</button>
            <button onClick={() => setShowMobileGuideModal(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><Smartphone className="w-5 h-5 text-[#25F4EE]" />Add to Home Screen</button>
            <button onClick={() => setShowNewFolderModal(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><FolderPlus className="w-5 h-5 text-[#25F4EE]" />New Collection</button>
          </div>
          <p className="text-xs text-slate-500 mt-8">TokVault · {items.length} saved links · Stored on this device</p>
        </section>
      )}

      {/* 1. ONBOARDING FLOW */}
      {showOnboarding && !passwordRecovery && (
        <Onboarding
          initial={profile}
          onComplete={completeOnboarding}
          onClose={() => {
            localStorage.setItem('tokvault_onboarding_done_v1', 'true');
            setShowOnboarding(false);
          }}
        />
      )}

      {/* 2. HARD PAYWALL IMMEDIATELY AFTER ONBOARDING (or when opened from menu) */}
      {!showOnboarding && (!subscription?.active || showPaywallPreview) && !passwordRecovery && (
        <Paywall
          isHardPaywall={!subscription?.active}
          userName={profile?.name}
          userEmail={session?.user.email}
          currentSubscription={subscription}
          onStartTrial={handleStartTrial}
          onRestorePurchases={handleRestorePurchases}
          onClose={() => setShowPaywallPreview(false)}
        />
      )}

      {/* 3. SUPABASE AUTH SCREEN (Email/Password & OAuth) */}
      {(showAuth || passwordRecovery) && (
        <AuthScreen
          recovery={passwordRecovery}
          onAdminOrVipUnlock={(role, email) => {
            const now = new Date();
            const sub: SubscriptionState = {
              active: true,
              planId: 'yearly',
              trialDays: 3650,
              startedAt: now.toISOString(),
              trialEndsAt: new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
              priceLabel:
                role === 'admin'
                  ? `Unlimited Admin Access (${email})`
                  : `Unlimited VIP Access (${email})`,
              provider: role,
              vipEmail: email
            };
            setSubscription(sub);
            localStorage.setItem(STORAGE_SUBSCRIPTION_KEY, JSON.stringify(sub));
            setShowPaywallPreview(false);
          }}
          onContinue={() => {
            sessionStorage.setItem('tokvault_guest_v1', 'true');
            setShowAuth(false);
          }}
          onRecovered={() => {
            setPasswordRecovery(false);
            setShowAuth(false);
          }}
        />
      )}

      {/* 4. ADMIN ACCESS MANAGER MODAL */}
      {showAdminModal && (
        <AdminModal
          adminEmail={
            session?.user.email ||
            subscription?.vipEmail ||
            getActiveAdminEmail() ||
            'dolair01@gmail.com'
          }
          onClose={() => setShowAdminModal(false)}
        />
      )}

      {bulkShare && <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4"><section role="dialog" aria-label="Share selected links" className="bg-[#14161D] border border-[#34394C] rounded-2xl p-5 max-w-md w-full"><h2 className="font-bold text-xl mb-3">Share selected links</h2><p className="text-xs text-slate-400 mb-3">Only original URLs are shared. Notes stay private.</p><textarea aria-label="Selected URLs" readOnly value={bulkShare} onFocus={e => e.target.select()} rows={5} className="w-full bg-[#0B0C10] border border-[#34394C] rounded-xl p-3 text-sm" /><div className="flex flex-wrap gap-2 mt-4"><button onClick={async () => { if (!navigator.share) return; try { await navigator.share({ text: bulkShare }); } catch { /* Cancel or unsupported: URLs remain available to copy. */ } }} className="p-3 rounded-xl bg-[#FE2C55]">Share to apps</button><button onClick={() => { const url = URL.createObjectURL(new Blob([bulkShare], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = 'tokvault-links.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="p-3 rounded-xl bg-[#252836]">Export links</button><button onClick={() => setBulkShare('')} className="p-3">Close</button></div></section></div>}
      {showDiscover && <Discover categoryIds={profile?.categoryIds || []} onSave={(url, category, title, handle) => {
        const id = `discover-${parseTikTokUrlParts(url).videoId}`;
        setItems(prev => prev.some(x => sameVideo(x, { url })) ? prev : [{ id, url, title, authorName: handle, authorHandle: `@${handle}`, videoId: parseTikTokUrlParts(url).videoId, embedUrl: `https://www.tiktok.com/player/v1/${parseTikTokUrlParts(url).videoId}`, collectionId: category, tags: [], notes: '', isFavorite: false, isWatched: false, createdAt: new Date().toISOString() }, ...prev]);
        setCollections(prev => prev.some(c => c.id === category) ? prev : [...prev, ...CATEGORY_OPTIONS.filter(c => c.id === category)]);
      }} onClose={() => setShowDiscover(false)} />}
      {sharingItem && <ShareLink item={sharingItem} onClose={() => setSharingItem(null)} />}

      {/* MODAL 1: IN-APP TIKTOK VIDEO PLAYER */}
      {playingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPlayingItem(null)}
        >
          <div
            className="bg-[#14161D] border border-[#2B3042] rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Official TikTok Embed Player */}
            <div className="w-full md:w-[340px] bg-black flex items-center justify-center min-h-[480px] shrink-0">
              {playingItem.embedUrl ? (
                <iframe
                  src={playingItem.embedUrl}
                  className="w-full h-[540px] border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={playingItem.title}
                />
              ) : (
                <div className="p-6 text-center space-y-3">
                  <Video className="w-10 h-10 text-[#FE2C55] mx-auto" />
                  <p className="text-xs text-slate-300">
                    Direct embed preview unavailable for this link format.
                  </p>
                  <a
                    href={playingItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FE2C55] text-white text-xs font-semibold"
                  >
                    Watch on TikTok <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Right: Metadata, Notes & Quick Actions */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-white">{playingItem.authorName}</h3>
                    <p className="text-xs text-[#25F4EE]">{playingItem.authorHandle}</p>
                  </div>
                  <button
                    aria-label="Close video"
                    onClick={() => setPlayingItem(null)}
                    className="p-1.5 rounded-lg bg-[#1E2230] text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed">{playingItem.title}</p>

                {playingItem.notes && (
                  <div className="p-3 rounded-xl bg-[#1B1E2B] border border-[#2B3042] text-xs text-amber-200">
                    <p className="font-semibold text-amber-400 mb-1">Your Personal Note:</p>
                    {playingItem.notes}
                  </div>
                )}

                {playingItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {playingItem.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg bg-[#1D202C] text-xs text-slate-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#252836] flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setEditingItem(playingItem);
                    setPlayingItem(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1E2230] hover:bg-[#282D40] text-xs font-medium text-slate-200 flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Note / Tags
                </button>

                <a
                  href={playingItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FE2C55] to-[#E01E45] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  Open in TikTok App <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ITEM (NOTES, TAGS, FOLDER) */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-[#14161D] border border-[#2B3042] rounded-2xl max-w-lg w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Edit Saved TikTok</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title / Caption</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#2B3042] text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Collection Folder</label>
                <select
                  value={editingItem.collectionId}
                  onChange={(e) => setEditingItem({ ...editingItem, collectionId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#2B3042] text-sm text-white"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Personal Notes (Searchable!)
                </label>
                <textarea
                  rows={3}
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  placeholder="Why did you save this video? Ingredients, timestamps, gift ideas..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#2B3042] text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editingItem.tags.join(', ')}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim().replace(/^#/, '').toLowerCase())
                        .filter(Boolean)
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#2B3042] text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-[#1E2230] text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setItems((prev) =>
                    prev.map((it) => (it.id === editingItem.id ? editingItem : it))
                  );
                  setEditingItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#FE2C55] text-xs font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW COLLECTION FOLDER */}
      {showNewFolderModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowNewFolderModal(false)}
        >
          <form
            onSubmit={handleCreateFolder}
            className="bg-[#14161D] border border-[#2B3042] rounded-2xl max-w-sm w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#25F4EE]" />
                New Collection Folder
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Folder Name</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Home Decor, Coding Tips, Comedy"
                className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#2B3042] text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Folder Accent Color</label>
              <div className="flex items-center gap-2">
                {['#FE2C55', '#25F4EE', '#A855F7', '#FF9F1C', '#2EC4B6', '#3B82F6', '#EC4899'].map(
                  (color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        newFolderColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1E2230] text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#FE2C55] text-xs font-semibold text-white"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: CLOUD BACKUP + LOCAL JSON BACKUP */}
      {showBackupModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowBackupModal(false)}
        >
          <div
            className="bg-[#14161D] border border-[#2B3042] rounded-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Cloud Storage & JSON Backup</h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CloudBackup
              session={session}
              onOpenAuth={() => {
                setShowBackupModal(false);
                setShowAuth(true);
              }}
              library={{
                version: 1,
                exportedAt: new Date().toISOString(),
                items,
                collections,
                profile: profile || undefined
              }}
              onRestore={(backup) => {
                setItems((prev) => mergeLibraries(prev, backup.items));
                if (!profile && backup.profile) {
                  setProfile(backup.profile);
                  localStorage.setItem('tokvault_profile_v1', JSON.stringify(backup.profile));
                }
                setCollections((prev) => [
                  ...prev,
                  ...backup.collections.filter((c) => !prev.some((x) => x.id === c.id))
                ]);
              }}
            />

            <div className="pt-2 border-t border-[#252836] space-y-2.5">
              <p className="text-xs font-semibold text-slate-300">Local File Backup (.json)</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Export a backup file to Files, iCloud Drive, or Google Drive, or import an existing
                backup file anytime.
              </p>

              <button
                onClick={handleExportBackup}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FE2C55] to-[#E01E45] text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Library Backup (.json)
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportBackup}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1E2230] hover:bg-[#282D40] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-[#2E344A]"
              >
                <Upload className="w-4 h-4 text-[#25F4EE]" />
                Import Library Backup (.json)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: iOS, ANDROID & WEB SHARE SETUP */}
      {showMobileGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowMobileGuideModal(false)}
        >
          <div
            className="bg-[#14161D] border border-[#2B3042] rounded-2xl max-w-lg w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#25F4EE]" />
                Use TokVault on Web, iOS & Android
              </h3>
              <button
                onClick={() => setShowMobileGuideModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#1A1D28] border border-[#282C3E] space-y-1">
                <p className="font-semibold text-white">1. Install to iOS / Android Home Screen (PWA)</p>
                <p className="text-slate-400">
                  Open this web app in Safari (iOS) or Chrome (Android) and tap{' '}
                  <span className="text-[#25F4EE]">Share → Add to Home Screen</span>. It runs full-screen
                  like a native app and registers as a share target (`?url=...`).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1A1D28] border border-[#282C3E] space-y-1">
                <p className="font-semibold text-white">2. Native App Store Builds (Capacitor Ready)</p>
                <p className="text-slate-400">
                  This project includes <code className="text-[#FE2C55]">capacitor.config.json</code>.
                  Run <code className="text-[#25F4EE]">npm run cap:ios</code> or{' '}
                  <code className="text-[#25F4EE]">npm run cap:android</code> to generate native Xcode
                  & Android Studio projects from the same codebase.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
