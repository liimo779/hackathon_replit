import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { arSA } from "@clerk/localizations";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import ServicesPage from "@/pages/services";
import ServiceDetail from "@/pages/service-detail";
import ProviderPublic from "@/pages/provider-public";
import { SignInPage, SignUpPage } from "@/pages/auth";
import Onboarding from "@/pages/onboarding";
import DashboardPage from "@/pages/dashboard";
import OrdersPage from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import ProviderServices from "@/pages/provider-services";
import ProviderProfile from "@/pages/provider-profile";
import Subscriptions from "@/pages/subscriptions";
import AdminPage from "@/pages/admin";
import AccountPage from "@/pages/account";
import Terms from "@/pages/terms";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(190 50% 23%)",
    colorForeground: "hsl(192 38% 14%)",
    colorMutedForeground: "hsl(195 14% 38%)",
    colorDanger: "hsl(4 64% 46%)",
    colorBackground: "hsl(40 60% 99%)",
    colorInput: "hsl(38 45% 97%)",
    colorInputForeground: "hsl(192 38% 14%)",
    colorNeutral: "hsl(192 38% 14%)",
    fontFamily: "'IBM Plex Sans Arabic', 'Tajawal', sans-serif",
    borderRadius: "0.8rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(40_60%_99%)] rounded-3xl w-[440px] max-w-full overflow-hidden border border-[hsl(34_28%_87%)] shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-['Tajawal'] text-2xl font-extrabold text-[hsl(192_38%_14%)]",
    headerSubtitle: "text-[hsl(195_14%_38%)]",
    socialButtonsBlockButtonText: "text-[hsl(192_38%_14%)] font-medium",
    formFieldLabel: "text-[hsl(192_38%_14%)] font-medium",
    footerActionLink: "text-[hsl(190_50%_23%)] font-bold hover:text-[hsl(36_80%_45%)]",
    footerActionText: "text-[hsl(195_14%_38%)]",
    dividerText: "text-[hsl(195_14%_38%)]",
    identityPreviewEditButton: "text-[hsl(190_50%_23%)]",
    formFieldSuccessText: "text-[hsl(158_45%_32%)]",
    alertText: "text-[hsl(192_38%_14%)]",
    logoBox: "justify-center",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border-[hsl(34_24%_80%)] bg-[hsl(38_45%_97%)] hover:bg-[hsl(36_32%_91%)]",
    formButtonPrimary: "bg-[hsl(190_50%_23%)] text-[hsl(38_55%_97%)] font-bold normal-case",
    formFieldInput: "border-[hsl(34_24%_80%)] bg-[hsl(38_45%_97%)] text-[hsl(192_38%_14%)]",
    footerAction: "justify-center",
    dividerLine: "bg-[hsl(34_26%_85%)]",
    alert: "border-[hsl(4_64%_46%/0.3)] bg-[hsl(4_64%_46%/0.06)]",
    otpCodeFieldInput: "border-[hsl(34_24%_80%)] text-[hsl(192_38%_14%)]",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

const localization = {
  ...arSA,
  signIn: { ...arSA.signIn, start: { ...arSA.signIn?.start, title: "أهلًا بعودتك إلى وَصل", subtitle: "سجّل دخولك لمتابعة طلباتك وخدماتك" } },
  signUp: { ...arSA.signUp, start: { ...arSA.signUp?.start, title: "أنشئ حسابك في وَصل", subtitle: "اطلب خدمتك، واعرض مهارتك" } },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) qc.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

const p = (C: () => ReactNode) => () => <Protected><C /></Protected>;

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/services/:id" component={ServiceDetail} />
        <Route path="/providers/:id" component={ProviderPublic} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/onboarding" component={p(Onboarding)} />
        <Route path="/dashboard" component={p(DashboardPage)} />
        <Route path="/orders" component={p(OrdersPage)} />
        <Route path="/orders/:id" component={p(OrderDetail)} />
        <Route path="/provider/services" component={p(ProviderServices)} />
        <Route path="/provider/profile" component={p(ProviderProfile)} />
        <Route path="/subscriptions" component={p(Subscriptions)} />
        <Route path="/admin" component={p(AdminPage)} />
        <Route path="/account" component={p(AccountPage)} />
        <Route path="/terms" component={Terms} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
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
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      localization={localization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Routes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
