import { ArrowRight, BookOpen, LockKeyhole, LogOut, MoveUpRight, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useClerk, useUser } from '@clerk/react';
import { Link } from 'wouter';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/lib/i18n';
import { DEFAULT_AVATAR, useUserProfile } from '@/lib/user-profile';
import { Interactive3DBook } from '@/components/interactive-3d-book';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function GateMark({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();

  return (
    <span className={`inline-flex items-center gap-2.5 ${compact ? 'text-sm' : ''}`} data-testid="brand-gatehouse">
      <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[hsl(var(--sidebar))] shadow-sm">
        <BookOpen className="h-5 w-5 text-[hsl(var(--card))]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="font-serif text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">{t('brand')}</span>
    </span>
  );
}

export function HomePage() {
  const { t } = useLanguage();
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { nickname, avatar } = useUserProfile();

  return (
    <main className="gate-noise min-h-[100dvh] overflow-hidden bg-[hsl(var(--background))]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-home-brand">
          <GateMark />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account navigation">
          <span className="hidden text-xs font-medium text-[hsl(var(--muted-foreground))] md:inline">{t('quietPlace')}</span>
          <LanguageSwitcher />

          <Link
            href="/user-portal"
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
            data-testid="link-cabinet-header"
          >
            <img
              src={avatar || DEFAULT_AVATAR}
              alt=""
              className="h-5 w-5 rounded-full object-cover border border-[hsl(var(--border))]"
            />
            <span>{isSignedIn ? nickname : t('cabinet')}</span>
          </Link>

          <Link
            href="/library"
            className="rounded-full bg-[hsl(var(--primary))] px-4 py-2 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
            data-testid="link-enter-library-header"
          >
            {t('enterLibraryBtn')}
          </Link>

          {isSignedIn ? (
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: `${window.location.origin}${basePath}/sign-up` })}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
              data-testid="button-sign-out-header"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('signOut')}</span>
            </button>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden rounded-full px-3 py-2 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
                data-testid="link-sign-in-header"
              >
                {t('signIn')}
              </Link>
              <Link
                href="/sign-up"
                className="hidden rounded-full border border-[hsl(var(--border))] px-3.5 py-2 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
                data-testid="link-sign-up-header"
              >
                {t('register')}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-20 lg:px-12 lg:pb-32 lg:pt-24">
        <div className="relative z-10 max-w-2xl">
          <div className="animate-rise-in mb-7 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            {t('privateEntrance')}
          </div>
          <h1 className="animate-rise-in animate-rise-in-delay-1 max-w-[760px] font-sans text-[clamp(3.25rem,8vw,7.3rem)] font-extrabold leading-[.91] tracking-[-0.08em] text-[hsl(var(--foreground))]">
            {t('headlineBefore')} <span className="font-serif text-[hsl(var(--primary))]">{t('headlineAccent')}</span>
          </h1>
          <p className="animate-rise-in animate-rise-in-delay-2 mt-8 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
            {t('intro')}
          </p>
          <div className="animate-rise-in animate-rise-in-delay-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/library" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[hsl(var(--accent))] px-6 py-3.5 text-sm font-extrabold text-[hsl(var(--accent-foreground))] shadow-[0_10px_24px_hsl(var(--accent)/.22)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2" data-testid="link-enter-library-hero">
              {t('enterLibraryBtn')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/user-portal" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-cabinet-hero">
              <UserRound className="h-4 w-4" />
              {t('cabinet')}
              <MoveUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-3 text-xs font-medium text-[hsl(var(--muted-foreground))]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /></span>
            {t('privateByDesign')}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] lg:mr-0 flex flex-col items-center">
          <div className="absolute -inset-5 rounded-[3rem] bg-[hsl(var(--accent)/.12)] blur-2xl" aria-hidden="true" />
          <div className="gate-grid animate-rise-in animate-rise-in-delay-2 relative w-full overflow-hidden rounded-[2.5rem] bg-[hsl(var(--sidebar))] p-5 shadow-[0_26px_70px_hsl(33.5_37.8%_17.6%/.24)] sm:p-7 flex flex-col items-center">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-[hsl(var(--accent)/.26)] pointer-events-none" aria-hidden="true" />
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full border border-[hsl(var(--accent)/.16)] pointer-events-none" aria-hidden="true" />
            <div className="w-full flex items-center justify-between mb-2 z-10">
              <GateMark compact />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--sidebar-foreground)/.75)] bg-[hsl(var(--accent)/.15)] px-2.5 py-1 rounded-full border border-[hsl(var(--accent)/.3)]">
                👑 Особенная книга
              </span>
            </div>

            {/* 3D Книга */}
            <div className="w-full py-4 flex justify-center">
              <Interactive3DBook />
            </div>

            <div className="w-full mt-2 pt-4 border-t border-[hsl(var(--sidebar-foreground)/.15)] flex items-end justify-between z-10">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--sidebar-foreground)/.53)]">
                  Изабель Вальмонт
                </p>
                <p className="mt-0.5 text-xs font-bold text-[hsl(var(--sidebar-foreground))]">
                  «Письма которые не должны были дойти»
                </p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[hsl(var(--accent))]">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
                3 000 ₸
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--card)/.48)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12 lg:py-20">
          <div>
             <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">{t('whyLibrary')}</p>
             <h2 className="mt-4 max-w-sm font-serif text-4xl font-semibold leading-[.95] tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-5xl">{t('openDoor')}</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
               {[
               { icon: BookOpen, title: t('calmCollection'), copy: t('calmCollectionCopy') },
               { icon: ShieldCheck, title: t('privateDefault'), copy: t('privateDefaultCopy') },
               { icon: Sparkles, title: t('straightShelf'), copy: t('straightShelfCopy') },
            ].map(({ icon: Icon, title, copy }) => (
              <div key={title} className="border-l border-[hsl(var(--border))] pl-5" data-testid={`feature-${title.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" />
                <h3 className="mt-5 text-sm font-extrabold text-[hsl(var(--foreground))]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-24">
        <div>
             <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">{t('simpleRoute')}</p>
             <h2 className="mt-4 max-w-xl font-serif text-5xl font-semibold leading-[.9] tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-6xl" dangerouslySetInnerHTML={{ __html: t('oneAccount') }} />
        </div>
        <div className="flex max-w-md items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] font-mono text-sm text-[hsl(var(--primary-foreground))]">01</span>
            <span className="h-10 w-px bg-[hsl(var(--border))]" />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] font-mono text-sm text-[hsl(var(--accent-foreground))]">02</span>
          </div>
          <div className="space-y-7">
             <div><p className="font-bold text-[hsl(var(--foreground))]">{t('registerStep')}</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{t('registerStepCopy')}</p></div>
             <div><p className="font-bold text-[hsl(var(--foreground))]">{t('chooseStep')}</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{t('chooseStepCopy')}</p></div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-[hsl(var(--border))] px-5 py-7 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <GateMark compact />
         <p data-testid="text-footer-note">{t('footerEntrance')}</p>
      </footer>
    </main>
  );
}

export function BrandMark() {
  return <GateMark />;
}