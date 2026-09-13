import { ArrowRight, BookOpen, Check, LockKeyhole, MoveUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'wouter';

function GateMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${compact ? 'text-sm' : ''}`} data-testid="brand-gatehouse">
      <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[hsl(var(--sidebar))] shadow-sm">
        <BookOpen className="h-5 w-5 text-[hsl(var(--card))]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="font-serif text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">The Library</span>
    </span>
  );
}

export function HomePage() {
  return (
    <main className="gate-noise min-h-[100dvh] overflow-hidden bg-[hsl(var(--background))]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-home-brand">
          <GateMark />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Account navigation">
          <span className="hidden text-xs font-medium text-[hsl(var(--muted-foreground))] sm:inline">Your quiet place to read</span>
          <Link href="/sign-in" className="rounded-full px-3.5 py-2 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-sign-in-header">
            Sign in
          </Link>
          <Link href="/sign-up" className="rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-sign-up-header">
            Register
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-20 lg:px-12 lg:pb-32 lg:pt-24">
        <div className="relative z-10 max-w-2xl">
          <div className="animate-rise-in mb-7 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            Your private library entrance
          </div>
          <h1 className="animate-rise-in animate-rise-in-delay-1 max-w-[760px] font-sans text-[clamp(3.25rem,8vw,7.3rem)] font-extrabold leading-[.91] tracking-[-0.08em] text-[hsl(var(--foreground))]">
            A quieter way <span className="font-serif text-[hsl(var(--primary))]">in.</span>
          </h1>
          <p className="animate-rise-in animate-rise-in-delay-2 mt-8 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
            Create an account once, then choose where to go. Open the library when you are ready, or stay here to manage your account.
          </p>
          <div className="animate-rise-in animate-rise-in-delay-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/sign-up" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[hsl(var(--accent))] px-6 py-3.5 text-sm font-extrabold text-[hsl(var(--accent-foreground))] shadow-[0_10px_24px_hsl(var(--accent)/.22)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2" data-testid="link-create-account-hero">
              Enter the library
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/sign-in" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-sign-in-hero">
              I already have an account
              <MoveUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-3 text-xs font-medium text-[hsl(var(--muted-foreground))]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /></span>
            Your reading room is private by design.
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] lg:mr-0">
          <div className="absolute -inset-5 rounded-[3rem] bg-[hsl(var(--accent)/.12)] blur-2xl" aria-hidden="true" />
          <div className="gate-grid animate-rise-in animate-rise-in-delay-2 relative min-h-[470px] overflow-hidden rounded-[2.5rem] bg-[hsl(var(--sidebar))] p-5 shadow-[0_26px_70px_hsl(33.5_37.8%_17.6%/.24)] sm:min-h-[530px] sm:p-7">
            <div className="absolute inset-0 opacity-45" aria-hidden="true">
              <img src={`${import.meta.env.BASE_URL}reading-illustration.png`} alt="" className="h-full w-full object-cover object-center mix-blend-screen" />
              <div className="absolute inset-0 bg-[hsl(var(--sidebar)/.48)] mix-blend-multiply" />
            </div>
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-[hsl(var(--accent)/.26)]" aria-hidden="true" />
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full border border-[hsl(var(--accent)/.16)]" aria-hidden="true" />
            <div className="relative z-10 flex items-center justify-between">
              <GateMark compact />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--sidebar-foreground)/.55)]">LIB / 01</span>
            </div>
            <div className="relative z-10 mt-20 flex items-center justify-center sm:mt-24">
              <div className="absolute h-64 w-64 rounded-full border border-[hsl(var(--sidebar-foreground)/.12)] sm:h-80 sm:w-80" />
              <div className="absolute h-48 w-48 rounded-full border border-[hsl(var(--sidebar-foreground)/.14)] sm:h-60 sm:w-60" />
              <div className="animate-drift flex h-36 w-44 items-center justify-center rounded-3xl border border-[hsl(var(--card)/.4)] bg-[hsl(var(--sidebar)/.46)] shadow-[0_18px_35px_hsl(33.5_37.8%_17.6%/.2)] sm:h-44 sm:w-56">
                <BookOpen className="h-20 w-20 text-[hsl(var(--card)/.9)]" strokeWidth={1} aria-hidden="true" />
              </div>
            </div>
            <div className="absolute bottom-7 left-7 right-7 z-10 flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--sidebar-foreground)/.53)]">Reading room</p>
                <p className="mt-1 text-sm font-bold text-[hsl(var(--sidebar-foreground))]">Your place is waiting</p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[hsl(var(--accent))]">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                OPEN
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--card)/.48)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12 lg:py-20">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">Why this library</p>
            <h2 className="mt-4 max-w-sm font-serif text-4xl font-semibold leading-[.95] tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-5xl">Good access should feel like an open door.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
              {[
              { icon: BookOpen, title: 'A calm collection', copy: 'A focused entrance keeps your reading space simple and easy to return to.' },
              { icon: ShieldCheck, title: 'Private by default', copy: 'Your account keeps the library personal, with no public shelf of your details.' },
              { icon: Sparkles, title: 'Straight to your shelf', copy: 'Once you are signed in, the entrance steps aside and opens your library.' },
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
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">The simple route</p>
          <h2 className="mt-4 max-w-xl font-serif text-5xl font-semibold leading-[.9] tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-6xl">One account.<br />One open shelf.</h2>
        </div>
        <div className="flex max-w-md items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] font-mono text-sm text-[hsl(var(--primary-foreground))]">01</span>
            <span className="h-10 w-px bg-[hsl(var(--border))]" />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] font-mono text-sm text-[hsl(var(--accent-foreground))]">02</span>
          </div>
          <div className="space-y-7">
            <div><p className="font-bold text-[hsl(var(--foreground))]">Register or sign in</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">New readers register; returning readers simply sign in.</p></div>
            <div><p className="font-bold text-[hsl(var(--foreground))]">Choose your next step</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">After access is confirmed, you decide whether to open the library or stay here.</p></div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-[hsl(var(--border))] px-5 py-7 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <GateMark compact />
        <p data-testid="text-footer-note">A quiet entrance to your private collection.</p>
      </footer>
    </main>
  );
}

export function BrandMark() {
  return <GateMark />;
}