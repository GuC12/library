import { ArrowLeft, BookOpen } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/react';
import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/lib/i18n';
import { Interactive3DBook } from '@/components/interactive-3d-book';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function AuthFrame({ children, mode }: { children: ReactNode; mode: 'sign-in' | 'sign-up' }) {
  const { t } = useLanguage();

  return (
    <main className="gate-noise flex min-h-[100dvh] flex-col bg-[hsl(var(--background))]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-auth-brand">
          <span className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[hsl(var(--sidebar))]">
              <BookOpen className="h-5 w-5 text-[hsl(var(--card))]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="font-serif text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">{t('brand')}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-back-home">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('backHome')}
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-5 sm:pb-16">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-10 items-center justify-items-center">
          {/* Интерактивная 3D-книга рядом с формой регистрации/входа */}
          <div className="flex flex-col items-center text-center max-w-md order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B1844D]/30 bg-[#B1844D]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#B1844D] mb-3">
              ✨ Эксклюзив библиотеки · 3 000 ₸
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              «Письма которые не должны были дойти»
            </h2>
            <p className="font-mono text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Автор: Изабель Вальмонт · Belladonna Press
            </p>

            <div className="my-5 w-full flex justify-center">
              <Interactive3DBook showDetailsButton={false} compact={false} />
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xs italic font-serif">
              «Одно случайное письмо. Два разбитых сердца из прошлого. И тайна, способная изменить всё...»
            </p>
          </div>

          {/* Форма авторизации Clerk */}
          <div className="w-full max-w-[440px] order-1 lg:order-2">
            <div className="mb-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">{t('brand')} / {mode === 'sign-in' ? '01' : '02'}</p>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))]">{mode === 'sign-in' ? t('welcomeBack') : t('takeSeat')}</h1>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{mode === 'sign-in' ? t('welcomeBackCopy') : t('takeSeatCopy')}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
      <p className="pb-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground)/.7)]">{t('quietCollection')}</p>
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