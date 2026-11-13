import { useMemo } from "react";
import { Link } from "wouter";
import { ClipboardList, Hourglass, CheckCircle2, Eye, Star, Briefcase, Wallet, Users, CreditCard, Percent, ArrowLeft, Circle, Search, Gift } from "lucide-react";
import { useGetDashboard, useGetMyProviderProfile, useListOrders, type Dashboard as D, type Order, type User } from "@workspace/api-client-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout";
import { RequireUser, FullSkeleton } from "@/components/session";
import { EmptyState, ErrorState, PageHeader, StatCard, StatusBadge, DemoBadge } from "@/components/common";
import { date, isSubActive, num, planLabel, sar } from "@/lib/format";

export default function DashboardPage() {
  return (
    <AppShell>
      <RequireUser>{(u) => <DashboardInner user={u} />}</RequireUser>
    </AppShell>
  );
}

function DashboardInner({ user }: { user: User }) {
  const q = useGetDashboard();
  if (q.isLoading) return <FullSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const first = user.name.split(" ")[0];
  return (
    <>
      <PageHeader eyebrow={user.role === "provider" ? "لوحة مقدم الخدمة" : user.role === "admin" ? "لوحة الإدارة" : "لوحة العميل"} title={`مرحبًا ${first}`}
        actions={user.role === "customer" ? <Button asChild><Link href="/services" data-testid="button-new-order"><Search className="h-4 w-4" /> اطلب خدمة</Link></Button> : user.role === "admin" ? <Button asChild><Link href="/admin">إدارة المنصة</Link></Button> : undefined} />
      {user.role === "provider" && <ProviderSetup d={d} />}
      {user.role === "admin" ? <AdminStats d={d} /> : user.role === "provider" ? <ProviderStats d={d} /> : <CustomerStats d={d} />}
      {user.role === "customer" && <RewardsSummary balance={d.pointsBalance} />}
      {user.role === "provider" && <CustomersTable />}
      <RecentOrders orders={d.recentOrders} />
    </>
  );
}

function ProviderSetup({ d }: { d: D }) {
  const profile = useGetMyProviderProfile();
  const subOk = isSubActive(d.subscription);
  const profileOk = !!profile.data && profile.data.bio.trim().length > 0;
  const servicesOk = d.serviceCount > 0;
  if (subOk && profileOk && servicesOk) return null;
  const steps = [
    { ok: subOk, t: "فعّل اشتراكك الشهري", d: "بدون اشتراك نشط لا يمكن نشر الخدمات أو استقبال طلبات.", href: "/subscriptions" },
    { ok: profileOk, t: "أكمل ملفك المهني", d: "النبذة والمهارات ونطاق التغطية.", href: "/provider/profile" },
    { ok: servicesOk, t: "انشر أول خدمة", d: "عنوان واضح وسعر ومدة.", href: "/provider/services" },
  ];
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-saffron/40 bg-accent/50 rise">
      <div className="p-6">
        <h2 className="text-xl font-bold">ابدأ في ثلاث خطوات</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t}>
              <Link href={s.href} data-testid={`link-step-${i}`} className="lift flex h-full gap-3 rounded-xl border bg-card p-4">
                {s.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-saffron" />}
                <div>
                  <div className={`font-semibold ${s.ok ? "text-muted-foreground line-through" : ""}`}>{s.t}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.d}</div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function CustomerStats({ d }: { d: D }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="كل طلباتي" value={num(d.totalOrders)} icon={ClipboardList} />
      <StatCard label="جديدة" value={num(d.newOrders)} icon={Hourglass} tone="saffron" />
      <StatCard label="قيد التنفيذ" value={num(d.inProgressOrders)} icon={Briefcase} tone="clay" />
      <StatCard label="مكتملة" value={num(d.completedOrders)} icon={CheckCircle2} tone="success" hint={`إجمالي الإنفاق ${sar(d.totalValue)}`} />
    </div>
  );
}

function RewardsSummary({ balance }: { balance: number }) {
  return (
    <Link href="/rewards" className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-saffron/40 bg-accent/35 p-5 transition-colors hover:bg-accent/60" data-testid="link-rewards-summary">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Gift className="h-5 w-5" /></div>
        <div><div className="font-bold">نقاط وَصل</div><div className="text-xs text-muted-foreground">رصيدك الحالي: {num(balance)} نقطة</div></div>
      </div>
      <ArrowLeft className="h-4 w-4 text-primary" />
    </Link>
  );
}

function ProviderStats({ d }: { d: D }) {
  const sub = d.subscription;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="طلبات جديدة" value={num(d.newOrders)} icon={Hourglass} tone="saffron" />
        <StatCard label="قيد التنفيذ" value={num(d.inProgressOrders)} icon={Briefcase} tone="clay" />
        <StatCard label="مكتملة" value={num(d.completedOrders)} icon={CheckCircle2} tone="success" />
        <StatCard label="قيمة الطلبات" value={sar(d.totalValue)} icon={Wallet} hint={`عمولة المنصة ${sar(d.commissionTotal)}`} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <StatCard label="خدماتي المنشورة" value={num(d.serviceCount)} icon={Briefcase} />
        <StatCard label="مشاهدات الملف" value={num(d.views)} icon={Eye} />
        <StatCard label="التقييم" value={d.rating ? d.rating.toFixed(1) : "—"} icon={Star} tone="saffron" hint={d.rating ? undefined : "لا توجد تقييمات بعد"} />
      </div>
      <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border bg-card p-5 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          {sub ? (
            <div>
              <div className="font-semibold">الخطة {planLabel[sub.plan]} — {isSubActive(sub) ? <span className="text-success">نشطة</span> : <span className="text-destructive">منتهية</span>}</div>
              <div className="text-xs text-muted-foreground">تنتهي في {date(sub.endsAt)}</div>
            </div>
          ) : <div className="font-semibold">لا يوجد اشتراك بعد</div>}
        </div>
        <Button asChild variant="outline"><Link href="/subscriptions">إدارة الاشتراك</Link></Button>
      </div>
    </>
  );
}

function AdminStats({ d }: { d: D }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="العملاء" value={num(d.customers)} icon={Users} />
        <StatCard label="مقدمو الخدمات" value={num(d.providers)} icon={Briefcase} tone="clay" />
        <StatCard label="اشتراكات نشطة" value={num(d.activeSubscriptions)} icon={CreditCard} tone="saffron" />
        <StatCard label="عمولات المنصة" value={sar(d.commissionTotal)} icon={Percent} tone="success" hint={`من ${num(d.totalOrders)} طلب بقيمة ${sar(d.totalValue)}`} />
      </div>
      {d.categoryDistribution.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card p-5">
          <h3 className="mb-4 font-bold">توزيع الخدمات حسب القسم</h3>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={d.categoryDistribution}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "IBM Plex Sans Arabic" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="عدد" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}

function CustomersTable() {
  const orders = useListOrders();
  const rows = useMemo(() => {
    const m = new Map<string, { name: string; count: number; total: number; completed: number }>();
    (orders.data ?? []).forEach((o) => {
      const r = m.get(o.customerId) ?? { name: o.customerName, count: 0, total: 0, completed: 0 };
      r.count += 1;
      if (o.status === "completed") { r.completed += 1; r.total += o.price; }
      m.set(o.customerId, r);
    });
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [orders.data]);
  if (orders.isLoading || rows.length === 0) return null;
  return (
    <div className="mt-8 rounded-2xl border bg-card p-5">
      <h3 className="mb-1 font-bold">عملائي</h3>
      <p className="mb-4 text-xs text-muted-foreground">محسوبة من سجل طلباتك الفعلي.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr className="border-b text-right"><th className="py-2 font-medium">العميل</th><th className="font-medium">الطلبات</th><th className="font-medium">المكتملة</th><th className="font-medium">قيمة المكتمل</th></tr></thead>
          <tbody>
            {rows.map(([id, r]) => (
              <tr key={id} className="border-b last:border-0"><td className="py-2.5 font-medium">{r.name}</td><td className="num">{num(r.count)}</td><td className="num">{num(r.completed)}</td><td className="num">{sar(r.total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OrderRow({ o }: { o: Order }) {
  return (
    <Link href={`/orders/${o.id}`} data-testid={`row-order-${o.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{o.serviceTitle}</span>
          {o.isDemo && <DemoBadge />}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">#{o.id} · {o.customerName} ← {o.providerName} · {date(o.createdAt)}</div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-bold num">{sar(o.total)}</span>
        <StatusBadge status={o.status} />
        <ArrowLeft className="hidden h-4 w-4 text-muted-foreground md:block" />
      </div>
    </Link>
  );
}

function RecentOrders({ orders }: { orders: Order[] }) {
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">أحدث الطلبات</h2>
        <Link href="/orders" className="text-sm font-semibold text-primary">كل الطلبات</Link>
      </div>
      {orders.length === 0 ? <EmptyState icon={ClipboardList} title="لا توجد طلبات بعد" text="ستظهر طلباتك هنا فور إرسالها أو استقبالها." /> : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">{orders.map((o) => <OrderRow key={o.id} o={o} />)}</div>
      )}
    </div>
  );
}
