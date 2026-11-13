import type { ReactNode } from "react";
import { Link } from "wouter";
import { AlertTriangle, Star, FlaskConical, MapPin, Clock, BadgeCheck, Home, User, Cpu, Layers } from "lucide-react";
import type { Category, OrderStatus, Service } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { basePath, deliveryLabel, fallbackImage, imgSrc, sar, statusLabel, statusTone, errMsg } from "@/lib/format";

export function Logo({ light = false, size = "md" }: { light?: boolean; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src={`${basePath}/logo.svg`} alt="" className={size === "lg" ? "h-11 w-11" : "h-9 w-9"} />
      <span className="leading-none">
        <span className={cn("font-display font-extrabold block", size === "lg" ? "text-3xl" : "text-2xl", light ? "text-sidebar-foreground" : "text-primary")}>وَصل</span>
        <span className={cn("text-[10px] tracking-[0.3em] font-semibold", light ? "text-sidebar-foreground/60" : "text-muted-foreground")}>WASL</span>
      </span>
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span data-testid="badge-demo" className={cn("inline-flex items-center gap-1 rounded-full border border-dashed border-clay/60 bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground", className)}>
      <FlaskConical className="h-3 w-3" /> بيانات تجريبية
    </span>
  );
}

export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-saffron/15 px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
      <BadgeCheck className="h-3.5 w-3.5 text-saffron" /> احترافي
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span data-testid={`status-${status}`} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusTone[status])}>
      {statusLabel[status]}
    </span>
  );
}

export function Rating({ rating, count }: { rating: number; count: number }) {
  if (!count) return <span className="text-xs text-muted-foreground">لا توجد تقييمات بعد</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-saffron text-saffron" />
      <span className="font-semibold num">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground text-xs">({count.toLocaleString("ar-SA")} تقييم)</span>
    </span>
  );
}

export function categoryIcon(cat?: Pick<Category, "icon" | "name"> | null, idx = 0) {
  const k = `${cat?.icon ?? ""} ${cat?.name ?? ""}`.toLowerCase();
  if (/home|house|منزل|wrench|hammer/.test(k)) return Home;
  if (/tech|cpu|laptop|تقن|code|monitor/.test(k)) return Cpu;
  if (/user|person|شخص|heart|sparkle/.test(k)) return User;
  return [Home, User, Cpu, Layers][idx % 4];
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between rise">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-bold tracking-wide text-clay">{eyebrow}</div>}
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "تعذّر تحميل البيانات" }: { error?: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div data-testid="state-error" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      {error != null && <p className="mt-1 text-sm text-muted-foreground">{errMsg(error)}</p>}
      {onRetry && (
        <Button data-testid="button-retry" variant="outline" className="mt-4" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Layers, title, text, action }: { icon?: typeof Layers; title: string; text?: string; action?: ReactNode }) {
  return (
    <div data-testid="state-empty" className="najdi-pattern rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground leading-relaxed">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CardsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card">
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ServiceCard({ s, categories }: { s: Service; categories?: Category[] }) {
  const idx = Math.max(0, (categories ?? []).findIndex((c) => c.id === s.categoryId));
  const cat = categories?.find((c) => c.id === s.categoryId);
  const src = s.images[0] ? imgSrc(s.images[0]) : fallbackImage(idx);
  return (
    <Link href={`/services/${s.id}`} data-testid={`card-service-${s.id}`} className="group lift flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img src={src} alt={s.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          {cat && <span className="rounded-full bg-card/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary backdrop-blur">{cat.name}</span>}
          {s.isDemo && <DemoBadge className="bg-card/90" />}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-snug line-clamp-2">{s.title}</h3>
          {s.professional && <ProBadge />}
        </div>
        <div className="text-sm text-muted-foreground">{s.providerName}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.city}{s.district ? `، ${s.district}` : ""}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration}</span>
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-dashed pt-3">
          <Rating rating={s.rating} count={s.reviewCount} />
          <div className="text-left">
            <div className="text-[10px] text-muted-foreground">{deliveryLabel[s.delivery]}</div>
            <div className="font-display text-lg font-extrabold text-primary num">{sar(s.price)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "primary", hint }: { label: string; value: ReactNode; icon: typeof Layers; tone?: "primary" | "saffron" | "clay" | "success"; hint?: string }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    saffron: "bg-saffron/15 text-accent-foreground",
    clay: "bg-clay/15 text-secondary-foreground",
    success: "bg-success/12 text-success",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 rise">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}><Icon className="h-4.5 w-4.5" /></span>
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold num">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
