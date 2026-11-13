import type { OrderStatus, ServiceDelivery } from "@workspace/api-client-react";

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function sar(n: number | undefined | null) {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;
}

export function num(n: number | undefined | null) {
  return Number(n ?? 0).toLocaleString("ar-SA");
}

export function date(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("ar-SA-u-ca-gregory", { year: "numeric", month: "long", day: "numeric" });
}

export const statusLabel: Record<OrderStatus, string> = {
  new: "جديد",
  accepted: "مقبول",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const statusTone: Record<OrderStatus, string> = {
  new: "bg-accent text-accent-foreground border-saffron/30",
  accepted: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-chart-5/15 text-foreground border-chart-5/30",
  completed: "bg-success/12 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export const deliveryLabel: Record<ServiceDelivery, string> = {
  customer_location: "في موقع العميل",
  provider_location: "في موقع مقدم الخدمة",
  remote: "عن بُعد",
};

export const roleLabel: Record<string, string> = {
  customer: "عميل",
  provider: "مقدم خدمة",
  admin: "مشرف",
};

export const planLabel: Record<string, string> = {
  basic: "الأساسية",
  professional: "الاحترافية",
};

export function errMsg(e: unknown): string {
  if (!e) return "حدث خطأ غير متوقع";
  const anyE = e as { data?: unknown; message?: string };
  const d = anyE.data as { error?: string; message?: string } | string | null | undefined;
  if (d && typeof d === "object" && (d.error || d.message)) return String(d.error || d.message);
  if (typeof d === "string" && d) return d;
  return anyE.message || "حدث خطأ غير متوقع";
}

export function imgSrc(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("/api/")) return src;
  if (src.startsWith("/")) return `${basePath}${src}`;
  return src;
}

export function fallbackImage(categoryIndex: number) {
  const imgs = ["/images/service-home.png", "/images/service-personal.png", "/images/service-tech.png"];
  return `${basePath}${imgs[Math.abs(categoryIndex) % 3]}`;
}

export function initials(name?: string) {
  if (!name) return "و";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function isSubActive(sub?: { status: string; endsAt: string } | null) {
  if (!sub) return false;
  return sub.status === "active" && new Date(sub.endsAt).getTime() > Date.now();
}
