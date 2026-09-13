import { ClerkProvider, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HomePage } from '@/pages/home';
import { SignInPage, SignUpPage } from '@/pages/auth-pages';
import { UserPortalPage } from '@/pages/user-portal';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: 'hsl(190 39% 29%)',
    colorForeground: 'hsl(224 28% 15%)',
    colorMutedForeground: 'hsl(221 12% 43%)',
    colorDanger: 'hsl(4 63% 46%)',
    colorBackground: 'hsl(42 33% 98%)',
    colorInput: 'hsl(41 38% 95%)',
    colorInputForeground: 'hsl(224 28% 15%)',
    colorNeutral: 'hsl(39 25% 83%)',
    fontFamily: 'Manrope, ui-sans-serif, sans-serif',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[hsl(42_33%_98%)] border border-[hsl(39_25%_83%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_16px_40px_hsl(224_28%_15%/.08)]',
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

function AuthLoadingState() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5">
      <div className="w-full max-w-sm space-y-4" aria-label="Loading Gatehouse">
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

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Sign in to continue through Gatehouse',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: 'Your private entry point starts here',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <LogoutReset />
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/user-portal" component={UserPortalRoute} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;