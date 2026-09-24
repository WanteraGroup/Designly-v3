import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Cog, LogIn, LogOut, ShieldCheck, UserPlus, X, Languages } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { LANGUAGES, type LanguageCode } from '../lib/constants';

/**
 * A bejelentkezo felulet szovegei.
 *
 * Az `AuthGate` a nyelvezet ELOTT renderel (a workspace ejszakaja), ezert itt
 * nem a `Home` `t()`-jet hasznaljuk: ez a komponens a sajat kis szotarat hozza,
 * ugyanabbol a `designly-language` kulcsbol olvasva, mint a workspace.
 */
const TEXT: Record<string, { hu: string; en: string }> = {
  loading: { hu: 'DESIGNLY betöltése…', en: 'Loading DESIGNLY…' },
  account: { hu: 'DESIGNLY fiók', en: 'DESIGNLY account' },
  admin: { hu: 'Admin menü', en: 'Admin menu' },
  ownerAdmin: { hu: 'Owner admin menü', en: 'Owner admin menu' },
  signOut: { hu: 'Kijelentkezés', en: 'Sign out' },
  signIn: { hu: 'Belépés', en: 'Sign in' },
  signUp: { hu: 'Fiók létrehozása', en: 'Create account' },
  lead: { hu: 'A generátor, az AI szerkesztő, az Extra Stúdió és a creator eszközök használatához bejelentkezés szükséges.', en: 'Signing in is required to use the generator, the AI editor, Extra Studio and the creator tools.' },
  email: { hu: 'E-mail', en: 'Email' },
  password: { hu: 'Jelszó', en: 'Password' },
  processing: { hu: 'Feldolgozás…', en: 'Processing…' },
  register: { hu: 'Regisztráció', en: 'Register' },
  noAccount: { hu: 'Még nincs fiókod? Regisztrálj.', en: 'No account yet? Register.' },
  hasAccount: { hu: 'Már van fiókod? Lépj be.', en: 'Already have an account? Sign in.' },
  shortPassword: { hu: 'A jelszó legalább 6 karakter legyen.', en: 'The password must be at least 6 characters.' },
  checkEmail: { hu: 'A regisztráció elkészült. Ellenőrizd az e-mail címedet, majd lépj be.', en: 'Registration is complete. Check your email, then sign in.' },
  failed: { hu: 'A bejelentkezés nem sikerült.', en: 'Sign-in failed.' },
  langLabel: { hu: 'Nyelv', en: 'Language' },
};

function useUiLanguage(): [LanguageCode, (next: LanguageCode) => void] {
  const [lang, setLang] = useState<LanguageCode>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested && LANGUAGES.some((l) => l.code === requested)) return requested as LanguageCode;
    const saved = window.localStorage.getItem('designly-language');
    return saved && LANGUAGES.some((l) => l.code === saved) ? saved as LanguageCode : 'hu';
  });
  function change(next: LanguageCode) {
    window.localStorage.setItem('designly-language', next);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.history.replaceState({}, '', url.toString());
    setLang(next);
  }
  return [lang, change];
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [ready, setReady] = useState(false);
  const [adminRole, setAdminRole] = useState<'owner'|'admin'|null>(null);
  const [lang, setLang] = useUiLanguage();
  const t = (key: string) => (lang === 'hu' ? TEXT[key]?.hu : (TEXT[key]?.en ?? TEXT[key]?.hu)) ?? key;

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
    return <div className="grid min-h-screen place-items-center bg-canvas text-ink-200">{t('loading')}</div>;
  }

  if (session) {
    return (
      <div className="relative">
        <div className="pointer-events-none fixed right-5 top-4 z-[70]">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-panel/90 px-3 py-1.5 text-[10px] text-ink-300 shadow-xl backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="max-w-44 truncate">{session.user.email ?? t('account')}</span>
            {adminRole && (
              <a
                href="/admin"
                className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent hover:bg-accent/20"
                aria-label={t('admin')}
                title={adminRole === 'owner' ? t('ownerAdmin') : t('admin')}
              >
                <Cog className="h-3.5 w-3.5" />
                <span>ADMIN</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => { void supabase.auth.signOut(); }}
              className="rounded-full p-1 text-ink-400 hover:bg-panel-hi hover:text-ink-100"
              aria-label={t('signOut')}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return <AuthPanel lang={lang} setLang={setLang} t={t} />;
}

function AuthPanel({ lang, setLang, t }: { lang: LanguageCode; setLang: (next: LanguageCode) => void; t: (key: string) => string }) {
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
      if (password.length < 6) throw new Error(t('shortPassword'));
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) throw signUpError;
        if (!data.session) setNotice(t('checkEmail'));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-line bg-panel/90 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[.24em] text-accent">DESIGNLY WORKSPACE</span>
            <label className="flex items-center gap-1.5 text-[10px] text-ink-400">
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{t('langLabel')}</span>
              <select
                value={lang}
                aria-label={t('langLabel')}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className="border-none bg-transparent text-[10px] text-ink-200 outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-canvas">{l.flag}</option>
                ))}
              </select>
            </label>
          </div>
          <h1 className="font-display text-3xl text-ink-100">{mode === 'signin' ? t('signIn') : t('signUp')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            {t('lead')}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input className="vp-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email')} required />
          <input className="vp-input" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('password')} required minLength={6} />
          <button type="submit" disabled={busy} className="vp-btn w-full justify-center">
            {mode === 'signin' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {busy ? t('processing') : mode === 'signin' ? t('signIn') : t('register')}
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
          {mode === 'signin' ? t('noAccount') : t('hasAccount')}
        </button>
      </div>
    </div>
  );
}
