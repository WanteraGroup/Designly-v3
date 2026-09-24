import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Cog, LogIn, LogOut, ShieldCheck, UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase-client';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [ready, setReady] = useState(false);
  const [adminRole, setAdminRole] = useState<'owner'|'admin'|null>(null);

  useEffect(() => {
    let active = true;

    async function refreshRole(nextSession: typeof session) {
      if (!nextSession) {
        setAdminRole(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', nextSession.user.id)
        .maybeSingle();
      if (!active) return;
      setAdminRole(profile?.role === 'owner' || profile?.role === 'admin' ? profile.role : null);
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await refreshRole(data.session);
      if (active) setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      void refreshRole(next);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);


  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-canvas text-ink-200">DESIGNLY betöltése…</div>;
  }

  if (session) {
    return (
      <div className="relative">
        <div className="pointer-events-none fixed right-5 top-4 z-[70]">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-panel/90 px-3 py-1.5 text-[10px] text-ink-300 shadow-xl backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="max-w-44 truncate">{session.user.email ?? 'DESIGNLY fiók'}</span>
            {adminRole && (
              <a
                href="/admin"
                className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent hover:bg-accent/20"
                aria-label="Admin menü"
                title={adminRole === 'owner' ? 'Owner admin menü' : 'Admin menü'}
              >
                <Cog className="h-3.5 w-3.5" />
                <span>ADMIN</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => { void supabase.auth.signOut(); }}
              className="rounded-full p-1 text-ink-400 hover:bg-panel-hi hover:text-ink-100"
              aria-label="Kijelentkezés"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return <AuthPanel />;
}

function AuthPanel() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      if (password.length < 6) throw new Error('A jelszó legalább 6 karakter legyen.');
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) throw signUpError;
        if (!data.session) setNotice('A regisztráció elkészült. Ellenőrizd az e-mail címedet, majd lépj be.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A bejelentkezés nem sikerült.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-line bg-panel/90 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <div className="mb-2 text-[10px] uppercase tracking-[.24em] text-accent">DESIGNLY WORKSPACE</div>
          <h1 className="font-display text-3xl text-ink-100">{mode === 'signin' ? 'Belépés' : 'Fiók létrehozása'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            A generátor, az AI szerkesztő, az Extra Stúdió és a creator eszközök használatához bejelentkezés szükséges.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input className="vp-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" required />
          <input className="vp-input" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Jelszó" required minLength={6} />
          <button type="submit" disabled={busy} className="vp-btn w-full justify-center">
            {mode === 'signin' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {busy ? 'Feldolgozás…' : mode === 'signin' ? 'Belépés' : 'Regisztráció'}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <X className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {notice && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{notice}</div>}

        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}
          className="mt-5 w-full text-xs text-ink-400 hover:text-ink-100"
        >
          {mode === 'signin' ? 'Még nincs fiókod? Regisztrálj.' : 'Már van fiókod? Lépj be.'}
        </button>
      </div>
    </div>
  );
}
