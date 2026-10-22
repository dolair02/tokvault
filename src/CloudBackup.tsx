import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Cloud, CloudUpload, CloudDownload, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { authClient } from './services/auth';
import { VaultBackup } from './types';

function isBackup(value: unknown): value is VaultBackup {
  const v = value as VaultBackup;
  return (
    !!v &&
    v.version === 1 &&
    Array.isArray(v.items) &&
    Array.isArray(v.collections) &&
    v.items.every(
      (x) =>
        x &&
        typeof x.id === 'string' &&
        typeof x.url === 'string' &&
        typeof x.title === 'string' &&
        typeof x.authorName === 'string' &&
        typeof x.authorHandle === 'string' &&
        typeof x.collectionId === 'string' &&
        typeof x.notes === 'string' &&
        typeof x.createdAt === 'string' &&
        Array.isArray(x.tags) &&
        x.tags.every((t) => typeof t === 'string')
    ) &&
    v.collections.every(
      (c) => c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.color === 'string'
    )
  );
}

export default function CloudBackup({
  session,
  library,
  onRestore,
  onOpenAuth
}: {
  session: Session | null;
  library: VaultBackup;
  onRestore: (backup: VaultBackup) => void;
  onOpenAuth?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [lastCloudUpdate, setLastCloudUpdate] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const enabled = !!authClient && !!session;

  useEffect(() => {
    if (!authClient || !session) {
      setLastCloudUpdate(null);
      return;
    }
    let active = true;
    authClient
      .from('vault_backups')
      .select('updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.updated_at) {
          setLastCloudUpdate(data.updated_at);
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  async function upload(confirmed = false) {
    if (!authClient || !session || busy) return;
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const { data: existing, error: readError } = await authClient
        .from('vault_backups')
        .select('updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (readError) throw readError;
      if (existing && !confirmed) {
        setReplace(true);
        return;
      }
      const nowIso = new Date().toISOString();
      const { error } = await authClient.from('vault_backups').upsert(
        {
          user_id: session.user.id,
          payload: library,
          updated_at: nowIso
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      setReplace(false);
      setLastCloudUpdate(nowIso);
      setMessage(`Cloud backup saved (${library.items.length} videos) to ${session.user.email}.`);
    } catch (err: unknown) {
      setIsError(true);
      const detail = err instanceof Error ? err.message : '';
      setMessage(
        detail
          ? `Cloud backup error: ${detail}`
          : 'Cloud backup is unavailable. Check the connection and account setup.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!authClient || !session || busy) return;
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const { data, error } = await authClient
        .from('vault_backups')
        .select('payload,updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setMessage('No cloud backup found for this account yet. Tap "Back up now" first.');
        return;
      }
      if (!isBackup(data.payload)) throw new Error('Invalid backup format');
      if (data.updated_at) setLastCloudUpdate(data.updated_at);
      onRestore(data.payload);
      setMessage(
        `Restored & merged ${data.payload.items.length} videos from your Supabase cloud backup.`
      );
    } catch (err: unknown) {
      setIsError(true);
      const detail = err instanceof Error ? err.message : '';
      setMessage(detail ? `Could not restore: ${detail}` : 'Could not restore this backup.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-4 rounded-xl bg-[#181B24] border border-[#282D3E] text-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-white">
          <Cloud className="w-4 h-4 text-[#25F4EE]" />
          Supabase Cloud Storage Backup
        </h3>
        {enabled ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
            Signed In
          </span>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
            Not Signed In
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {enabled ? (
          <>
            Signed in as <strong className="text-slate-200">{session.user.email}</strong>.
            {lastCloudUpdate && (
              <span className="block text-[#25F4EE] mt-0.5">
                Last cloud backup: {new Date(lastCloudUpdate).toLocaleString()}
              </span>
            )}
          </>
        ) : (
          'Sign in with your email & password to back up and sync your library across Web, iOS, and Android using Supabase Cloud Storage.'
        )}
      </p>

      {!enabled && onOpenAuth ? (
        <button
          type="button"
          onClick={onOpenAuth}
          className="w-full py-2.5 px-4 rounded-xl bg-[#25F4EE]/15 hover:bg-[#25F4EE]/25 text-[#25F4EE] border border-[#25F4EE]/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          Sign In / Create Account for Cloud Backup
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            disabled={!enabled || busy}
            onClick={() => void upload()}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#25F4EE]/15 hover:bg-[#25F4EE]/25 text-[#25F4EE] border border-[#25F4EE]/30 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            {busy ? 'Working…' : 'Back up now'}
          </button>
          <button
            disabled={!enabled || busy}
            onClick={restore}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#252836] hover:bg-[#2F3346] text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <CloudDownload className="w-4 h-4 text-[#25F4EE]" />
            Restore & merge
          </button>
        </div>
      )}

      {replace && (
        <div className="mt-2 p-3 border border-amber-400/30 bg-amber-500/10 rounded-xl text-xs space-y-2">
          <p className="text-amber-200">
            Replace your existing cloud backup with this device’s current library ({library.items.length} videos)?
          </p>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => void upload(true)}
              className="px-3 py-1.5 rounded-lg bg-[#25F4EE] text-[#0B0C10] font-bold"
            >
              Yes, update cloud backup
            </button>
            <button
              onClick={() => setReplace(false)}
              className="px-3 py-1.5 rounded-lg bg-[#252836] text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`text-xs flex items-center gap-1.5 ${
            isError ? 'text-rose-300' : 'text-emerald-300'
          }`}
        >
          {isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{message}</span>
        </p>
      )}
    </section>
  );
}
