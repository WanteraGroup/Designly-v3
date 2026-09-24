import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';

const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));

function Fallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#07080c] text-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
    </div>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DESIGNLY runtime error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#07080c] px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/20 bg-red-400/5 p-6">
          <h1 className="text-xl font-bold">DESIGNLY betöltési hiba</h1>
          <p className="mt-2 text-sm text-white/60">
            Az oldal egy kliensoldali hibát kapott. Frissítsd az oldalt; a hiba részlete alább látható.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black"
            >
              Újratöltés
            </button>
            <a href="/" className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/80">
              Főoldal
            </a>
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-xs text-white/50">Technikai részletek</summary>
            <pre className="mt-3 overflow-auto rounded-xl bg-black/30 p-4 text-xs text-red-200">
              {this.state.error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <AppErrorBoundary>
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Home />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </AppErrorBoundary>,
);
