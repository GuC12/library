import { useClerk, useUser } from '@clerk/react';
import { ArrowRight, ExternalLink, LogOut, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';

const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

export function UserPortalPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [redirecting, setRedirecting] = useState(Boolean(redirectUrl));

  useEffect(() => {
    if (!isLoaded || !user || !redirectUrl) {
      setRedirecting(false);
      return;
    }
    setRedirecting(true);
    const timer = window.setTimeout(() => {
      window.location.assign(redirectUrl);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isLoaded, user]);

  if (!isLoaded || redirecting) {
    return (
      <main className="gate-noise flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5">
        <div className="w-full max-w-md text-center" data-testid="status-redirecting">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[hsl(var(--sidebar))] shadow-[0_16px_40px_hsl(33.5_37.8%_17.6%/.2)]">
            <div className="relative flex h-11 w-11 items-end justify-center rounded-t-[2rem] border-[5px] border-b-0 border-[hsl(var(--card))] pb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">Access verified</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))]">Opening your library</h1>
          <div className="mx-auto mt-8 h-1 w-48 overflow-hidden rounded-full bg-[hsl(var(--secondary))]"><div className="animate-pulse-line h-full w-full origin-left rounded-full bg-[hsl(var(--accent))]" /></div>
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Just a moment while we open your reading room.</p>
        </div>
      </main>
    );
  }

  if (!redirectUrl) {
    return (
      <main className="gate-noise flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5 py-12">
        <div className="w-full max-w-xl rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-md)] sm:p-10" data-testid="state-missing-destination">
          <div className="flex items-center justify-between">
            <span className="relative flex h-11 w-11 items-end justify-center rounded-[14px] bg-[hsl(var(--sidebar))] pb-2">
              <span className="absolute top-[9px] h-[21px] w-[19px] rounded-t-[11px] border-[3px] border-[hsl(var(--card))] border-b-0" />
              <span className="h-[3px] w-[28px] rounded-full bg-[hsl(var(--accent))]" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Portal / ready</span>
          </div>
          <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">One last configuration</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[.95] tracking-[-0.07em] text-[hsl(var(--foreground))] sm:text-5xl">You are in.<br /><span className="text-[hsl(var(--primary))]">The door is not set yet.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))]">Your account is ready, but this Library does not have a destination URL configured. Add <code className="rounded bg-[hsl(var(--secondary))] px-1.5 py-1 font-mono text-xs text-[hsl(var(--foreground))]">VITE_AUTH_REDIRECT_URL</code> to continue visitors to your library site.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })} className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="button-sign-out-portal">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
            <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-return-home">
              Return home
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-3 border-t border-[hsl(var(--border))] pt-5 text-xs text-[hsl(var(--muted-foreground))]">
            <Settings2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
            <span>Configuration is intentionally kept in the environment, not in the browser.</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))]">
      <a className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]" href={redirectUrl} data-testid="link-open-destination">
        Continue to your site
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </main>
  );
}