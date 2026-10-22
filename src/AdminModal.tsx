import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Copy,
  Check,
  Trash2,
  X,
  Crown,
  Send
} from 'lucide-react';
import {
  GrantedVipUser,
  getGrantedVipUsers,
  saveGrantedVipUsers,
  buildVipInviteLink
} from './services/adminAccess';

interface AdminModalProps {
  adminEmail: string;
  onClose: () => void;
}

export default function AdminModal({ adminEmail, onClose }: AdminModalProps) {
  const [vipUsers, setVipUsers] = useState<GrantedVipUser[]>(() => getGrantedVipUsers());
  const [newEmail, setNewEmail] = useState('');
  const [newPasscode, setNewPasscode] = useState('TokVaultVIP!');
  const [newNote, setNewNote] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleGrantAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    const link = buildVipInviteLink(cleanEmail, newPasscode.trim() || 'TokVaultVIP!', newNote);
    const entry: GrantedVipUser = {
      email: cleanEmail,
      passcode: newPasscode.trim() || 'TokVaultVIP!',
      note: newNote.trim() || 'Granted by Admin',
      grantedAt: new Date().toISOString(),
      inviteLink: link
    };

    const updated = [entry, ...vipUsers.filter((u) => u.email !== cleanEmail)];
    setVipUsers(updated);
    saveGrantedVipUsers(updated);
    setNewEmail('');
    setNewNote('');
    setFeedback(`Unlimited access granted to ${cleanEmail}! Copy their 1-click unlock link below.`);
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleRemoveVip = (email: string) => {
    const updated = vipUsers.filter((u) => u.email !== email);
    setVipUsers(updated);
    saveGrantedVipUsers(updated);
  };

  const handleCopyLink = async (user: GrantedVipUser) => {
    try {
      await navigator.clipboard.writeText(user.inviteLink);
      setCopiedEmail(user.email);
      setTimeout(() => setCopiedEmail(null), 3000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#14161D] border border-[#2B3042] rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252836] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-[#FE2C55] flex items-center justify-center text-black shadow-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Admin Access Manager
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Owner
                </span>
              </h2>
              <p className="text-xs text-slate-400">Signed in as {adminEmail} (Unlimited Access)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1E2230] text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grant Unlimited Access Form */}
        <form
          onSubmit={handleGrantAccess}
          className="p-4 rounded-xl bg-[#191C26] border border-[#2B3042] space-y-3"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#25F4EE] flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            Grant Someone Unlimited Free Access
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Their Email Address *</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#34394C] text-xs text-white focus:border-[#25F4EE] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Their Login Passcode / Password *
              </label>
              <input
                type="text"
                required
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                placeholder="TokVaultVIP!"
                className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#34394C] text-xs text-white focus:border-[#25F4EE] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Optional Note (Who is this?)</label>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="e.g., Family, Beta Tester, Influencer Partner"
              className="w-full px-3 py-2 rounded-xl bg-[#0B0C10] border border-[#34394C] text-xs text-white focus:border-[#25F4EE] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FE2C55] to-[#8B5CF6] hover:from-[#FF3B63] hover:to-[#9333EA] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Crown className="w-4 h-4 fill-amber-300 text-amber-200" />
            Grant Unlimited Access & Generate Unlock Link
          </button>

          {feedback && (
            <p className="text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-2.5">
              {feedback}
            </p>
          )}
        </form>

        {/* Granted VIP Users List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              People Granted Unlimited Access ({vipUsers.length + 1})
            </h3>
          </div>

          {/* Owner Permanent Entry */}
          <div className="p-3.5 rounded-xl bg-[#181B24] border border-amber-400/30 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                dolair01@gmail.com
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold">
                  Owner / Admin
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Permanent Unlimited Access + Admin Controls
              </p>
            </div>
          </div>

          {vipUsers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No additional VIP users added yet. Enter an email above to grant someone free unlimited access!
            </p>
          ) : (
            vipUsers.map((u) => (
              <div
                key={u.email}
                className="p-3.5 rounded-xl bg-[#181B24] border border-[#282D3E] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      {u.email}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                        VIP Unlimited
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Passcode: <code className="text-[#25F4EE]">{u.passcode}</code>
                      {u.note ? ` • ${u.note}` : ''}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveVip(u.email)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Revoke access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(u)}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#25F4EE]/15 hover:bg-[#25F4EE]/25 text-[#25F4EE] border border-[#25F4EE]/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedEmail === u.email ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied 1-Click VIP Unlock Link!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy 1-Click VIP Unlock Link
                      </>
                    )}
                  </button>

                  {typeof navigator.share === 'function' && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator
                          .share({
                            title: 'TokVault Pro VIP Access',
                            text: `Here is your free Unlimited VIP Access link for TokVault Pro:`,
                            url: u.inviteLink
                          })
                          .catch(() => {});
                      }}
                      className="py-2 px-3 rounded-lg bg-[#252836] hover:bg-[#303446] text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Share
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
