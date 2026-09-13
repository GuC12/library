import { ArrowRight, Check, LockKeyhole, MoveUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'wouter';

function GateMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${compact ? 'text-sm' : ''}`} data-testid="brand-gatehouse">
      <span className="relative flex h-9 w-9 items-end justify-center rounded-[11px] bg-[hsl(var(--sidebar))] pb-1.5 shadow-sm">
        <span className="absolute top-[8px] h-[18px] w-[16px] rounded-t-[9px] border-[3px] border-[hsl(var(--card))] border-b-0" />
        <span className="h-[3px] w-[24px] rounded-full bg-[hsl(var(--accent))]" />
      </span>
      <span className="font-sans font-extrabold tracking-[-0.04em] text-[hsl(var(--foreground))]">gatehouse</span>
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
          <span className="hidden text-xs font-medium text-[hsl(var(--muted-foreground))] sm:inline">Private access, made clear.</span>
          <Link href="/sign-in" className="rounded-full px-3.5 py-2 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-sign-in-header">
            Sign in
          </Link>
          <Link href="/sign-up" className="rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-sign-up-header">
            Create account
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-20 lg:px-12 lg:pb-32 lg:pt-24">
        <div className="relative z-10 max-w-2xl">
          <div className="animate-rise-in mb-7 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            Your private entry point
          </div>
          <h1 className="animate-rise-in animate-rise-in-delay-1 max-w-[760px] font-sans text-[clamp(3.25rem,8vw,7.3rem)] font-extrabold leading-[.91] tracking-[-0.08em] text-[hsl(var(--foreground))]">
            A quieter way <span className="text-[hsl(var(--primary))]">in.</span>
          </h1>
          <p className="animate-rise-in animate-rise-in-delay-2 mt-8 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
            Gatehouse is the private front door to this site. Create your account once, then move straight through to the work waiting on the other side.
          </p>
          <div className="animate-rise-in animate-rise-in-delay-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/sign-up" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[hsl(var(--accent))] px-6 py-3.5 text-sm font-extrabold text-[hsl(var(--accent-foreground))] shadow-[0_10px_24px_hsl(var(--accent)/.22)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2" data-testid="link-create-account-hero">
              Enter through Gatehouse
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/sign-in" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-sign-in-hero">
              I already have an account
              <MoveUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-3 text-xs font-medium text-[hsl(var(--muted-foreground))]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /></span>
            Your access is private by design.
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] lg:mr-0">
          <div className="absolute -inset-5 rounded-[3rem] bg-[hsl(var(--accent)/.12)] blur-2xl" aria-hidden="true" />
          <div className="gate-grid animate-rise-in animate-rise-in-delay-2 relative min-h-[470px] overflow-hidden rounded-[2.5rem] bg-[hsl(var(--sidebar))] p-5 shadow-[0_26px_70px_hsl(191_40%_23%/.2)] sm:min-h-[530px] sm:p-7">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-[hsl(var(--accent)/.26)]" aria-hidden="true" />
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full border border-[hsl(var(--accent)/.16)]" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <GateMark compact />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--sidebar-foreground)/.55)]">GH / 01</span>
            </div>
            <div className="relative mt-20 flex items-center justify-center sm:mt-24">
              <div className="absolute h-64 w-64 rounded-full border border-[hsl(var(--sidebar-foreground)/.12)] sm:h-80 sm:w-80" />
              <div className="absolute h-48 w-48 rounded-full border border-[hsl(var(--sidebar-foreground)/.14)] sm:h-60 sm:w-60" />
              <div className="animate-drift relative flex h-36 w-36 items-end justify-center rounded-t-[5rem] border-[10px] border-b-0 border-[hsl(var(--card))] bg-[hsl(var(--sidebar)/.55)] pb-[-1px] sm:h-44 sm:w-44">
                <div className="absolute -bottom-3 h-3 w-52 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_0_7px_hsl(var(--sidebar)),0_7px_20px_hsl(var(--accent)/.28)] sm:w-64" />
                <div className="mb-7 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] shadow-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--sidebar))]" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--sidebar-foreground)/.53)]">Connection</p>
                <p className="mt-1 text-sm font-bold text-[hsl(var(--sidebar-foreground))]">Ready when you are</p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[hsl(var(--accent))]">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                SECURE
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--card)/.48)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12 lg:py-20">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">Why Gatehouse</p>
            <h2 className="mt-4 max-w-sm text-3xl font-extrabold leading-tight tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-4xl">Good access should feel like a welcome, not a checkpoint.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'Private by default', copy: 'A focused entryway keeps the rest of the site out of view until you are ready.' },
              { icon: Check, title: 'Clear at every step', copy: 'No mystery redirects or dead ends. You always know what happens next.' },
              { icon: Sparkles, title: 'Made to disappear', copy: 'Once you are in, Gatehouse gets out of the way and takes you there.' },
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
          <h2 className="mt-4 max-w-xl text-4xl font-extrabold leading-[.95] tracking-[-0.06em] text-[hsl(var(--foreground))] sm:text-5xl">One account.<br />One clear destination.</h2>
        </div>
        <div className="flex max-w-md items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] font-mono text-sm text-[hsl(var(--primary-foreground))]">01</span>
            <span className="h-10 w-px bg-[hsl(var(--border))]" />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] font-mono text-sm text-[hsl(var(--accent-foreground))]">02</span>
          </div>
          <div className="space-y-7">
            <div><p className="font-bold text-[hsl(var(--foreground))]">Create or sign in</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use the secure account flow that fits you.</p></div>
            <div><p className="font-bold text-[hsl(var(--foreground))]">Continue to your site</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">We will send you straight through after success.</p></div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-[hsl(var(--border))] px-5 py-7 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <GateMark compact />
        <p data-testid="text-footer-note">A private entry point for a better place.</p>
      </footer>
    </main>
  );
}

export function BrandMark() {
  return <GateMark />;
}