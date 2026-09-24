/*
 * A bejelentkezesi kapu.
 *
 * A `verify_jwt = true` bekapcsolasa utan auth nelkul nincs generalas. Ez a
 * komponens egy helyen kezeli a bejelentkezest es a regisztraciot, hogy a
 * Home ne kenyszeruljon erre a sajat allapotkezelesen keresztul.
 *
 * A mod most egyszeru: email + jelszo. A Supabase Auth ezt keszen adja, es
 * a session token az, amit az Edge Functionok ellenorizni tudnak.
 */
import { useState } from 'react';
import { Loader2, LogIn, Mail, Lock, X } from 'lucide-react';
import { supabase } from '../lib/supabase-client';

export default function AuthGate({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit() {
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        onClose();
      } else {
        const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) throw e;
        setNotice('A fiók elkészült. Ha a projekt email-megerősítést kér, nézd meg a postafiókodat, majd jelentkezz be.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A bejelentkezés nem sikerült.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-ink-100">
              {mode === 'signin' ? 'Bejelentkezés' : 'Fiók létrehozása'}
            </h2>
            <p className="mt-1 text-xs text-ink-400">
              A generáláshoz bejelentkezés szükséges, mert a kreditek a fiókodhoz tartoznak.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Bezárás" className="text-ink-400 hover:text-ink-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-3 block text-xs text-ink-400">
          Email
          <span className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-panel-hi px-3">
            <Mail className="h-4 w-4 text-ink-500" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink-100 outline-none"
              placeholder="nev@pelda.hu"
            />
          </span>
        </label>

        <label className="mb-4 block text-xs text-ink-400">
          Jelszó
          <span className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-panel-hi px-3">
            <Lock className="h-4 w-4 text-ink-500" />
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink-100 outline-none"
              placeholder="••••••••"
            />
          </span>
        </label>

        {error && (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
        )}
        {notice && (
          <p className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</p>
        )}

        <button type="button" disabled={busy || !email.trim() || !password} onClick={submit} className="vp-btn w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {mode === 'signin' ? 'Bejelentkezés' : 'Regisztráció'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}
          className="mt-3 w-full text-center text-xs text-ink-400 hover:text-ink-100"
        >
          {mode === 'signin' ? 'Nincs még fiókod? Regisztrálj' : 'Van már fiókod? Jelentkezz be'}
        </button>
      </section>
    </div>
  );
}
