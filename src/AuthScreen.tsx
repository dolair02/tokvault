import React, { useState } from 'react';
import { Apple, Bookmark, Loader2, Mail, X } from 'lucide-react';
import { authClient, authRedirect, googleAuthEnabled, appleAuthEnabled } from './services/auth';

export default function AuthScreen({
  recovery = false,
  onContinue,
  onRecovered
}: {
  recovery?: boolean;
  onContinue: () => void;
  onRecovered: () => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const configured = Boolean(authClient);

  async function oauth(provider: 'google' | 'apple') {
    if (!authClient) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await authClient.auth.signInWithOAuth({
        provider,
        options: { redirectTo: authRedirect() }
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Unable to connect. Please try again or use email sign-in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResendConfirmation() {
    if (!authClient || !email) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error } = await authClient.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: authRedirect() }
      });
      if (error) throw error;
      setMessage(`Confirmation email resent to ${email}. Check your inbox and spam folder.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Could not resend confirmation email right now.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authClient) return;
    setError('');
    setMessage('');
    setNeedsConfirmation(false);

    if (recovery && password !== confirm) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (recovery) {
        const { error } = await authClient.auth.updateUser({ password });
        if (error) throw error;
        onRecovered();
        return;
      }
      if (mode === 'forgot') {
        const { error } = await authClient.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirect()
        });
        if (error) throw error;
        setMessage(
          'If an eligible account exists, you’ll receive a reset link. For Google or Apple accounts, use that sign-in button.'
        );
      } else if (mode === 'signup') {
        const { data, error } = await authClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirect() }
        });
        if (error) throw error;
        if (data.session) {
          onContinue();
        } else {
          setNeedsConfirmation(true);
          setMessage(
            `Account created for ${email}! Please check your email inbox (and spam folder) for the confirmation link, then sign in.`
          );
        }
      } else {
        const { error } = await authClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onContinue();
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : '';
      if (/email not confirmed/i.test(rawMsg)) {
        setNeedsConfirmation(true);
        setError(
          'Your email is not confirmed yet. Click the confirmation link sent to your email, or click "Resend confirmation email" below.'
        );
      } else if (/invalid login credentials/i.test(rawMsg)) {
        setError(
          'Invalid email or password. If you haven’t created an account yet, tap "New here? Create an account" below.'
        );
      } else {
        setError(
          rawMsg ||
            (mode === 'signin' && !recovery
              ? 'Sign-in failed. Check your details or use Google or Apple if that is how you joined.'
              : 'We couldn’t complete that request. Please try again shortly.')
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const changeMode = (next: typeof mode) => {
    setMode(next);
    setMessage('');
    setError('');
    setNeedsConfirmation(false);
    setPassword('');
    setConfirm('');
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-[#0B0C10] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div
        className="max-w-md mx-auto px-6 py-8"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-[#25F4EE] fill-[#FE2C55]" />
            <span className="text-xl font-bold">TokVault</span>
          </div>
          {!recovery && (
            <button
              type="button"
              onClick={onContinue}
              aria-label="Close sign in"
              className="p-2 rounded-full bg-[#171A24] text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <h1 id="auth-title" className="text-3xl font-bold mb-3">
          {recovery
            ? 'Choose a new password'
            : mode === 'forgot'
            ? 'Forgot your password?'
            : mode === 'signup'
            ? 'Create your account'
            : 'Welcome to your vault'}
        </h1>
        <p className="text-sm text-slate-400 mb-7">
          {recovery
            ? 'Use at least 8 characters.'
            : mode === 'forgot'
            ? 'Enter your email and we’ll send you a reset link.'
            : 'Sign in with email & password to back up and restore your saved TikToks in Supabase Cloud Storage.'}
        </p>

        {!configured && (
          <div
            role="status"
            className="p-4 rounded-xl border border-[#25F4EE]/20 bg-[#25F4EE]/5 text-sm text-slate-300 mb-6"
          >
            Account sign-in is coming soon. You can use TokVault on this device without an account.
          </div>
        )}

        {!recovery && mode !== 'forgot' && (
          <>
            <div className="space-y-3">
              <button
                disabled={!configured || !googleAuthEnabled || busy}
                title={!googleAuthEnabled ? 'Google sign-in setup pending' : undefined}
                onClick={() => oauth('google')}
                className="w-full min-h-[52px] rounded-xl bg-white text-slate-900 font-semibold flex items-center justify-center gap-3 disabled:opacity-40"
              >
                <span className="font-bold text-lg" aria-hidden="true">
                  G
                </span>
                Continue with Google
              </button>
              <button
                disabled={!configured || !appleAuthEnabled || busy}
                title={!appleAuthEnabled ? 'Apple sign-in setup pending' : undefined}
                onClick={() => oauth('apple')}
                className="w-full min-h-[52px] rounded-xl bg-[#1B1E27] border border-[#34394C] font-semibold flex items-center justify-center gap-3 disabled:opacity-40"
              >
                <Apple className="w-5 h-5" />
                Continue with Apple
              </button>
            </div>
            {configured && (!googleAuthEnabled || !appleAuthEnabled) && (
              <p className="text-xs text-slate-500 mt-3">
                {!googleAuthEnabled && !appleAuthEnabled
                  ? 'Google and Apple sign-in setup is still in progress.'
                  : !appleAuthEnabled
                  ? 'Apple sign-in setup is still in progress.'
                  : 'Google sign-in setup is still in progress.'}{' '}
                Email & password sign-in is live below.
              </p>
            )}
            <div className="flex items-center gap-3 my-6 text-xs text-slate-500">
              <span className="h-px bg-[#252836] flex-1" />
              or use email & password
              <span className="h-px bg-[#252836] flex-1" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-4">
          {!recovery && (
            <label className="block text-sm text-slate-300">
              Email
              <input
                disabled={!configured || busy}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full p-3.5 mt-2 rounded-xl border border-[#34394C] bg-[#171A24] text-base text-white disabled:opacity-40"
              />
            </label>
          )}

          {(recovery || mode !== 'forgot') && (
            <label className="block text-sm text-slate-300">
              {recovery ? 'New password' : 'Password'}
              <input
                disabled={!configured || busy}
                type="password"
                required
                minLength={recovery || mode === 'signup' ? 8 : undefined}
                autoComplete={recovery || mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                className="block w-full p-3.5 mt-2 rounded-xl border border-[#34394C] bg-[#171A24] text-base text-white disabled:opacity-40"
              />
            </label>
          )}

          {recovery && (
            <label className="block text-sm text-slate-300">
              Confirm new password
              <input
                disabled={!configured || busy}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="block w-full p-3.5 mt-2 rounded-xl border border-[#34394C] bg-[#171A24] text-base text-white"
              />
            </label>
          )}

          {!recovery && mode === 'signin' && (
            <button
              type="button"
              onClick={() => changeMode('forgot')}
              className="block ml-auto text-sm text-[#25F4EE] py-1"
            >
              Forgot password?
            </button>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 space-y-2">
              <p>{error}</p>
              {needsConfirmation && email && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  className="text-[#25F4EE] font-semibold underline block"
                >
                  Resend confirmation email to {email}
                </button>
              )}
            </div>
          )}

          {message && (
            <div role="status" className="p-3 rounded-xl bg-[#25F4EE]/10 border border-[#25F4EE]/30 text-xs text-[#25F4EE] space-y-2">
              <p>{message}</p>
              {needsConfirmation && email && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  className="text-white font-semibold underline block"
                >
                  Resend confirmation email
                </button>
              )}
            </div>
          )}

          <button
            disabled={!configured || busy}
            className="w-full py-4 rounded-xl bg-[#FE2C55] hover:bg-[#FF3B63] text-white font-bold flex justify-center items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-4 h-4" />}
            {recovery
              ? 'Save new password'
              : mode === 'forgot'
              ? 'Send reset link'
              : mode === 'signup'
              ? 'Create account'
              : 'Sign in with Email'}
          </button>
        </form>

        {!recovery && (
          <>
            <button
              onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')}
              className="w-full py-5 text-sm text-slate-300 hover:text-white"
            >
              {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
            <button onClick={onContinue} className="w-full py-3 text-sm text-[#25F4EE]">
              Continue without an account
            </button>
          </>
        )}
        <p className="mt-6 text-xs text-slate-500 text-center">
          Saved links stay on this device and can be backed up to your Supabase cloud vault anytime.
        </p>
      </div>
    </div>
  );
}
