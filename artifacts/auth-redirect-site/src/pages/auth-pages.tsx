import { ArrowLeft, BookOpen } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/react';
import type { ReactNode } from 'react';
import { Link } from 'wouter';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function AuthFrame({ children, mode }: { children: ReactNode; mode: 'sign-in' | 'sign-up' }) {
  return (
    <main className="gate-noise flex min-h-[100dvh] flex-col bg-[hsl(var(--background))]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-auth-brand">
          <span className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[hsl(var(--sidebar))]">
              <BookOpen className="h-5 w-5 text-[hsl(var(--card))]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="font-serif text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">The Library</span>
          </span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-back-home">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to library entrance
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-5 sm:pb-16">
        <div className="w-full max-w-[440px]">
          <div className="mb-7 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">The Library / {mode === 'sign-in' ? '01' : '02'}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))]">{mode === 'sign-in' ? 'Welcome back.' : 'Take a seat.'}</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{mode === 'sign-in' ? 'Your shelf is waiting.' : 'A private reading room is a few details away.'}</p>
          </div>
          {children}
        </div>
      </div>
      <p className="pb-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground)/.7)]">A quiet entrance to your collection.</p>
    </main>
  );
}

export function SignInPage() {
  return (
    <AuthFrame mode="sign-in">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

export function SignUpPage() {
  return (
    <AuthFrame mode="sign-up">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}