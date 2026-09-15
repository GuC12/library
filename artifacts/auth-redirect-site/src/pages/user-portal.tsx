import { useClerk, useUser } from '@clerk/react';
import { BookOpen, Check, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';

export function UserPortalPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [stayed, setStayed] = useState(false);

  if (!isLoaded) {
    return (
      <main className="gate-noise flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5">
        <div className="w-full max-w-md text-center" data-testid="status-loading-account">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[hsl(var(--sidebar))] shadow-[0_16px_40px_hsl(33.5_37.8%_17.6%/.2)]">
            <BookOpen className="h-10 w-10 text-[hsl(var(--card))]" strokeWidth={1.4} aria-hidden="true" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">Your account</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))]">Checking your shelf</h1>
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Just a moment.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="gate-noise flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5 py-12">
      <div className="w-full max-w-2xl rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-md)] sm:p-10" data-testid="account-choice">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[hsl(var(--sidebar))]">
            <BookOpen className="h-6 w-6 text-[hsl(var(--card))]" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">The Library / account</span>
        </div>
        <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">Access verified</p>
        <h1 className="mt-4 max-w-xl font-serif text-5xl font-semibold leading-[.9] tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-6xl">Where would you like to read?</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))]">
          You are signed in as <span className="font-bold text-[hsl(var(--foreground))]">{user?.primaryEmailAddress?.emailAddress ?? user?.username ?? 'reader'}</span>. Choose whether to open the library site or stay here on the registration website.
        </p>
        <div className="mt-9 grid gap-3 sm:grid-cols-2">
          <Link href="/library" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-open-library">
            Open the library
            <BookOpen className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <button type="button" onClick={() => setStayed(true)} className="inline-flex items-center justify-center gap-3 rounded-full border border-[hsl(var(--border))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary)/.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="button-stay-here">
            Stay on this site
            {stayed ? <Check className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" /> : null}
          </button>
        </div>
        {stayed ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[hsl(var(--accent)/.5)] bg-[hsl(var(--accent)/.12)] px-4 py-3 text-sm text-[hsl(var(--foreground))]" role="status">
            <Check className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
            You are staying on the registration site. Your account is ready whenever you are.
          </div>
        ) : null}
        <div className="mt-10 flex items-center justify-between border-t border-[hsl(var(--border))] pt-5">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">You can open the library whenever you choose.</span>
          <button type="button" onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="button-sign-out-portal">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}