import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, Show } from "@clerk/react";
import {
  LayoutDashboard, ClipboardList, Search, Briefcase, UserCog, CreditCard, ShieldCheck, Settings, LogOut, Menu, X, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { basePath, initials, roleLabel } from "@/lib/format";
import { Logo } from "./common";
import { useSession } from "./session";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/services", label: "تصفح الخدمات" },
    { href: "/#how", label: "كيف يعمل" },
    { href: "/#providers", label: "لمقدمي الخدمات" },
    { href: "/terms", label: "الشروط" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" data-testid="link-home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Show when="signed-in">
            <Button asChild data-testid="button-go-dashboard"><Link href="/dashboard">لوحتي</Link></Button>
          </Show>
          <Show when="signed-out">
            <Button asChild variant="ghost" data-testid="button-sign-in"><Link href="/sign-in">تسجيل الدخول</Link></Button>
            <Button asChild data-testid="button-sign-up"><Link href="/sign-up">أنشئ حسابك</Link></Button>
          </Show>
        </div>
        <button className="md:hidden rounded-lg p-2 hover:bg-muted" onClick={() => setOpen(!open)} data-testid="button-mobile-menu" aria-label="القائمة">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-background px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">{l.label}</Link>
          ))}
          <div className="mt-2 flex gap-2">
            <Show when="signed-in"><Button asChild className="flex-1"><Link href="/dashboard">لوحتي</Link></Button></Show>
            <Show when="signed-out">
              <Button asChild variant="outline" className="flex-1"><Link href="/sign-in">دخول</Link></Button>
              <Button asChild className="flex-1"><Link href="/sign-up">حساب جديد</Link></Button>
            </Show>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-24 bg-sidebar text-sidebar-foreground">
      <div className="sadu-band" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <Logo light size="lg" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-foreground/70">اطلب خدمتك، واعرض مهارتك. سوق محلي يصل  بأصحاب المهارات المستقلين في مدن المملكة.</p>
        </div>
        <div>
          <div className="mb-3 font-bold">المنصة</div>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li><Link href="/services" className="hover:text-saffron">الخدمات</Link></li>
            <li><Link href="/sign-up" className="hover:text-saffron">انضم كمقدم خدمة</Link></li>
            <li><Link href="/terms" className="hover:text-saffron">الشروط والأحكام</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-bold">ملاحظة</div>
          <p className="text-sm leading-relaxed text-sidebar-foreground/70">هذا نموذج أولي. المدفوعات محاكاة ولا تُخصم أي مبالغ حقيقية.</p>
        </div>
      </div>
      <div className="border-t border-sidebar-border py-5 text-center text-xs text-sidebar-foreground/50">وَصل {new Date().getFullYear()}</div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

type NavItem = { href: string; label: string; icon: typeof Menu };

function navFor(role?: string): NavItem[] {
  const common: NavItem[] = [
    { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/orders", label: "الطلبات", icon: ClipboardList },
  ];
  if (role === "provider")
    return [
      ...common,
      { href: "/subscriptions", label: "الاشتراك", icon: CreditCard },
      { href: "/provider/profile", label: "ملفي المهني", icon: UserCog },
      { href: "/provider/services", label: "خدماتي", icon: Briefcase },
      { href: "/services", label: "السوق", icon: Search },
      { href: "/account", label: "الحساب", icon: Settings },
    ];
  if (role === "admin")
    return [
      ...common,
      { href: "/admin", label: "الإدارة", icon: ShieldCheck },
      { href: "/services", label: "السوق", icon: Search },
      { href: "/account", label: "الحساب", icon: Settings },
    ];
  return [...common, { href: "/services", label: "اطلب خدمة", icon: Search }, { href: "/account", label: "الحساب", icon: Settings }];
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useSession();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const items = navFor(user?.role);

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active = location === it.href || (it.href !== "/dashboard" && location.startsWith(it.href + "/"));
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            data-testid={`nav-${it.href.replace(/\//g, "-").slice(1)}`}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <it.icon className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-0.5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-3">
      <Link href="/terms" className="flex items-center gap-2 px-3 text-xs text-sidebar-foreground/50 hover:text-saffron"><FileText className="h-3.5 w-3.5" /> الشروط والأحكام</Link>
      <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
        <Avatar className="h-9 w-9"><AvatarFallback className="bg-saffron text-sidebar-primary-foreground font-bold">{initials(user?.name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" data-testid="text-username">{user?.name ?? "..."}</div>
          <div className="text-[11px] text-sidebar-foreground/60">{user ? roleLabel[user.role] : ""}</div>
        </div>
        <button data-testid="button-logout" title="تسجيل الخروج" onClick={() => signOut({ redirectUrl: basePath || "/" })} className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar hover:text-saffron">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh]">
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <Link href="/" className="px-2 pt-2"><Logo light /></Link>
        <div className="sadu-band rounded-full opacity-80" />
        {nav}
        {footer}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground animate-in slide-in-from-right">
            <div className="flex items-center justify-between px-2 pt-2"><Logo light /><button onClick={() => setOpen(false)} aria-label="إغلاق"><X className="h-5 w-5" /></button></div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} data-testid="button-open-nav" aria-label="القائمة" className="rounded-lg p-2 hover:bg-muted"><Menu className="h-5 w-5" /></button>
          <Logo />
          <span className="w-9" />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
