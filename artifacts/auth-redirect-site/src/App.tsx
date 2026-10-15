import { ClerkProvider, useAuth, useClerk, useSession, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { DailyReaderVisit } from '@/components/reader-journey';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { setSupabaseAccessTokenProvider } from '@/lib/supabase';

const HomePage = lazy(() => import('@/pages/home').then(module => ({ default: module.HomePage })));
const SignInPage = lazy(() => import('@/pages/auth-pages').then(module => ({ default: module.SignInPage })));
const SignUpPage = lazy(() => import('@/pages/auth-pages').then(module => ({ default: module.SignUpPage })));
const UserPortalPage = lazy(() => import('@/pages/user-portal').then(module => ({ default: module.UserPortalPage })));
const LibraryPage = lazy(() => import('@/pages/library').then(module => ({ default: module.LibraryPage })));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/library-brand.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: 'hsl(32.7 26.5% 32.5%)',
    colorForeground: 'hsl(33.5 37.8% 17.6%)',
    colorMutedForeground: 'hsl(33.5 24% 34%)',
    colorDanger: 'hsl(4 63% 46%)',
    colorBackground: 'hsl(42 42% 97%)',
    colorInput: 'hsl(40.7 24.6% 86%)',
    colorInputForeground: 'hsl(33.5 37.8% 17.6%)',
    colorNeutral: 'hsl(40.7 24.6% 55.3%)',
    fontFamily: 'Manrope, ui-sans-serif, sans-serif',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[hsl(42_42%_97%)] border border-[hsl(40.7_24.6%_55.3%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_16px_40px_hsl(33.5_37.8%_17.6%/.12)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[hsl(224_28%_15%)] font-extrabold tracking-tight',
    headerSubtitle: 'text-[hsl(221_12%_43%)]',
    socialButtonsBlockButtonText: 'text-[hsl(224_28%_15%)] font-bold',
    formFieldLabel: 'text-[hsl(224_28%_15%)] font-bold',
    footerActionLink: 'text-[hsl(190_39%_29%)] font-bold',
    footerActionText: 'text-[hsl(221_12%_43%)]',
    dividerText: 'text-[hsl(221_12%_43%)]',
    identityPreviewEditButton: 'text-[hsl(190_39%_29%)]',
    formFieldSuccessText: 'text-[hsl(190_39%_29%)]',
    alertText: 'text-[hsl(4_63%_36%)]',
    logoBox: 'h-12',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-[hsl(39_25%_83%)] bg-[hsl(42_33%_98%)] hover:bg-[hsl(39_26%_91%)]',
    formButtonPrimary: 'bg-[hsl(190_39%_29%)] text-[hsl(42_33%_98%)] font-bold rounded-xl',
    formFieldInput: 'border-[hsl(39_25%_83%)] bg-[hsl(41_38%_95%)] text-[hsl(224_28%_15%)] rounded-xl',
    footerAction: 'border-t border-[hsl(39_25%_83%)]',
    dividerLine: 'bg-[hsl(39_25%_83%)]',
    alert: 'border-[hsl(4_63%_46%/.25)] bg-[hsl(4_63%_46%/.06)]',
    otpCodeFieldInput: 'border-[hsl(39_25%_83%)] bg-[hsl(41_38%_95%)] text-[hsl(224_28%_15%)]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoadingState />;
  return isSignedIn ? <Redirect to="/user-portal" /> : <HomePage />;
}

function UserPortalRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoadingState />;
  return isSignedIn ? <UserPortalPage /> : <Redirect to="/" />;
}

function LibraryRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  if (!isLoaded) return <AuthLoadingState />;
  return isSignedIn ? <LibraryPage key={user?.id ?? 'signed-in'} /> : <Redirect to="/sign-in" />;
}

function AuthLoadingState() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5">
      <div className="w-full max-w-sm space-y-4" aria-label="Loading the Library">
        <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-[hsl(var(--secondary))]" />
        <div className="mx-auto h-4 w-36 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
        <div className="mx-auto h-3 w-52 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
      </div>
    </main>
  );
}

function LogoutReset() {
  const { addListener } = useClerk();
  const queryClientInstance = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        queryClientInstance.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClientInstance]);

  return null;
}

function SupabaseClerkSessionBridge() {
  const { session } = useSession();

  useLayoutEffect(() => {
    setSupabaseAccessTokenProvider(session ? () => session.getToken() : null);
    return () => setSupabaseAccessTokenProvider(null);
  }, [session]);

  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { language, t } = useLanguage();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        locale: language === 'kk' ? 'kk-KZ' : language === 'zh' ? 'zh-CN' : language === 'ru' ? 'ru-RU' : 'en-US',
        signIn: {
          start: {
            title: t('welcomeBack').replace('.', ''),
            subtitle: t('welcomeBackCopy'),
          },
        },
        signUp: {
          start: {
            title: t('register'),
            subtitle: t('takeSeatCopy'),
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <SupabaseClerkSessionBridge />
        <DailyReaderVisit />
        <LogoutReset />
        <RoutedErrorBoundary>
          <Suspense fallback={<AuthLoadingState />}>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/user-portal" component={UserPortalRoute} />
              <Route path="/library" component={LibraryRoute} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </RoutedErrorBoundary>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function MissingClerkKeyNotice() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5">
      <p className="max-w-xl text-center text-base leading-relaxed text-[hsl(var(--foreground))]">
        Не найден ключ Clerk. Создайте файл .env в папке artifacts/auth-redirect-site и добавьте туда
        VITE_CLERK_PUBLISHABLE_KEY=ваш_ключ
      </p>
    </main>
  );
}

function App() {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return <MissingClerkKeyNotice />;
  }

  return (
    <TooltipProvider>
      <LanguageProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </LanguageProvider>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
