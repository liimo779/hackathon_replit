import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Briefcase, CreditCard, Percent, Plus, Pencil, Trash2, Search, Eye, ClipboardList } from "lucide-react";
import {
  useListAdminUsers, getListAdminUsersQueryKey, useSetProviderStatus, useListCategories, getListCategoriesQueryKey, useSaveCategory, useDeleteCategory,
  useGetDashboard, useGetMarketplaceStats, useListOrders, useListSubscriptions, useGetProvider, getGetProviderQueryKey, getListProvidersQueryKey,
  type Category, type User,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/layout";
import { RequireUser } from "@/components/session";
import { DemoBadge, EmptyState, ErrorState, PageHeader, StatCard, Rating, ProBadge } from "@/components/common";
import { OrderRow } from "./dashboard";
import { date, errMsg, imgSrc, initials, isSubActive, num, planLabel, roleLabel, sar } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  return <AppShell><RequireUser roles={["admin"]}>{() => <Inner />}</RequireUser></AppShell>;
}

function Inner() {
  const dash = useGetDashboard();
  const stats = useGetMarketplaceStats();
  const d = dash.data;
  return (
    <>
      <PageHeader eyebrow="الإدارة" title="إدارة المنصة" subtitle="المستخدمون، تفعيل مقدمي الخدمات، الأقسام، والطلبات والاشتراكات." />
      {dash.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        : dash.error ? <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
        : d && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="العملاء" value={num(d.customers)} icon={Users} />
            <StatCard label="مقدمو الخدمات" value={num(d.providers)} icon={Briefcase} tone="clay" />
            <StatCard label="اشتراكات نشطة" value={num(d.activeSubscriptions)} icon={CreditCard} tone="saffron" />
            <StatCard label="العمولات" value={sar(d.commissionTotal)} icon={Percent} tone="success" hint={`${num(d.totalOrders)} طلب · ${sar(d.totalValue)}`} />
          </div>
        )}
      {stats.data && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>السوق العام: {num(stats.data.services)} خدمة · {num(stats.data.reviews)} تقييم · {num(stats.data.completedOrders)} طلب مكتمل</span>
          {stats.data.demo && <DemoBadge />}
        </div>
      )}
      <Tabs defaultValue="users" className="mt-8" dir="rtl">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users" data-testid="tab-users">المستخدمون</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">الأقسام</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">الطلبات</TabsTrigger>
          <TabsTrigger value="subs" data-testid="tab-subs">الاشتراكات</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-5"><UsersTab /></TabsContent>
        <TabsContent value="categories" className="mt-5"><CategoriesTab /></TabsContent>
        <TabsContent value="orders" className="mt-5"><OrdersTab /></TabsContent>
        <TabsContent value="subs" className="mt-5"><SubsTab /></TabsContent>
      </Tabs>
    </>
  );
}

function UsersTab() {
  const q = useListAdminUsers();
  const m = useSetProviderStatus();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | User["role"]>("all");
  const [pending, setPending] = useState<User | null>(null);
  const [inspect, setInspect] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = useMemo(() => (q.data ?? []).filter((u) => (role === "all" || u.role === role) && (`${u.name} ${u.email} ${u.city}`.toLowerCase().includes(search.toLowerCase()))), [q.data, role, search]);

  const toggle = () => {
    if (!pending) return;
    setErr(null);
    m.mutate({ id: pending.id, data: { active: !pending.active } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        qc.invalidateQueries({ queryKey: getListProvidersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProviderQueryKey(pending.id) });
        toast({ title: pending.active ? "تم إيقاف مقدم الخدمة" : "تم تفعيل مقدم الخدمة" });
        setPending(null);
      },
      onError: (e) => setErr(errMsg(e)),
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input data-testid="input-user-search" className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الاسم أو البريد أو المدينة" /></div>
        <div className="flex gap-1">{(["all", "customer", "provider", "admin"] as const).map((r) => <Button key={r} size="sm" variant={role === r ? "default" : "outline"} onClick={() => setRole(r)}>{r === "all" ? "الكل" : roleLabel[r]}</Button>)}</div>
      </div>
      {q.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
        : list.length === 0 ? <EmptyState icon={Users} title="لا يوجد مستخدمون مطابقون" />
        : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr className="border-b text-right"><th className="p-3 font-medium">المستخدم</th><th className="font-medium">الدور</th><th className="font-medium">الموقع</th><th className="font-medium">الحالة</th><th className="p-3 font-medium">إجراءات</th></tr></thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b last:border-0" data-testid={`row-user-${u.id}`}>
                    <td className="p-3"><div className="flex items-center gap-2 font-semibold">{u.name}{u.isDemo && <DemoBadge />}</div><div className="text-xs text-muted-foreground" dir="ltr">{u.email}</div></td>
                    <td>{roleLabel[u.role]}</td>
                    <td className="text-muted-foreground">{u.city}، {u.district}</td>
                    <td>{u.active ? <span className="font-semibold text-success">نشط</span> : <span className="font-semibold text-destructive">موقوف</span>}</td>
                    <td className="p-3">
                      {u.role === "provider" && (
                        <div className="flex items-center gap-3">
                          <Switch checked={u.active} onCheckedChange={() => { setErr(null); setPending(u); }} data-testid={`switch-provider-${u.id}`} />
                          <Button size="sm" variant="ghost" onClick={() => setInspect(u.id)} data-testid={`button-inspect-${u.id}`}><Eye className="h-4 w-4" /> الملف</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <AlertDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.active ? "إيقاف" : "تفعيل"} {pending?.name}؟</AlertDialogTitle>
            <AlertDialogDescription>{pending?.active ? "لن تظهر خدماته في السوق ولن يستقبل طلبات جديدة." : "ستعود خدماته للظهور إن كان اشتراكه نشطًا."}</AlertDialogDescription>
          </AlertDialogHeader>
          {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-provider-status" disabled={m.isPending} onClick={(e) => { e.preventDefault(); toggle(); }}>{m.isPending ? "جارٍ..." : "تأكيد"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Sheet open={!!inspect} onOpenChange={(v) => !v && setInspect(null)}>
        <SheetContent side="left" dir="rtl" className="w-full overflow-y-auto sm:max-w-lg">{inspect && <ProviderInspect id={inspect} />}</SheetContent>
      </Sheet>
    </>
  );
}

function ProviderInspect({ id }: { id: string }) {
  const q = useGetProvider(id, { query: { enabled: !!id, queryKey: getGetProviderQueryKey(id) } });
  return (
    <>
      <SheetHeader><SheetTitle>ملف مقدم الخدمة</SheetTitle></SheetHeader>
      {q.isLoading ? <Skeleton className="mt-6 h-64" /> : q.error || !q.data ? <div className="mt-6"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (() => {
        const { provider: p, services, reviews } = q.data;
        return (
          <div className="mt-6 space-y-5">
            <div className="flex items-center gap-3">
              {p.avatar ? <img src={imgSrc(p.avatar)} className="h-16 w-16 rounded-xl object-cover" alt="" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{initials(p.name)}</div>}
              <div>
                <div className="text-lg font-bold">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.city}، {p.district}</div>
                <div className="mt-1 flex gap-1.5">{p.professional && <ProBadge />}{p.isDemo && <DemoBadge />}{!p.active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">موقوف / منتهٍ</span>}</div>
              </div>
            </div>
            <Rating rating={p.rating} count={p.reviewCount} />
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.bio || "بدون نبذة"}</p>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-muted p-2"><div className="font-bold">{num(services.length)}</div>خدمات</div>
              <div className="rounded-lg bg-muted p-2"><div className="font-bold">{num(reviews.length)}</div>تقييمات</div>
              <div className="rounded-lg bg-muted p-2"><div className="font-bold">{num(p.views)}</div>مشاهدات</div>
            </div>
            <ul className="space-y-2">{services.map((s) => <li key={s.id}><Link href={`/services/${s.id}`} className="flex justify-between rounded-lg border p-3 text-sm hover:border-primary"><span>{s.title}</span><span className="num">{sar(s.price)}</span></Link></li>)}</ul>
            <Button asChild variant="outline" className="w-full"><Link href={`/providers/${p.id}`}>فتح الملف العام</Link></Button>
          </div>
        );
      })()}
    </>
  );
}

function CategoriesTab() {
  const q = useListCategories();
  const save = useSaveCategory();
  const del = useDeleteCategory();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edit, setEdit] = useState<Partial<Category> | null>(null);
  const [subs, setSubs] = useState("");
  const [toDel, setToDel] = useState<Category | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const open = (c: Partial<Category>) => { setErr(null); setEdit(c); setSubs((c.subcategories ?? []).join("، ")); };
  const submit = () => {
    if (!edit) return;
    setErr(null);
    save.mutate({ data: { id: edit.id, name: (edit.name ?? "").trim(), icon: (edit.icon ?? "").trim(), subcategories: subs.split(/[،,\n]/).map((s) => s.trim()).filter(Boolean) } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); toast({ title: "تم حفظ القسم" }); setEdit(null); },
      onError: (e) => setErr(errMsg(e)),
    });
  };
  const remove = () => {
    if (!toDel) return;
    setErr(null);
    del.mutate({ id: toDel.id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); toast({ title: "تم حذف القسم" }); setToDel(null); },
      onError: (e) => setErr(errMsg(e)),
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open({ name: "", icon: "", subcategories: [] })} data-testid="button-add-category"><Plus className="h-4 w-4" /> قسم جديد</Button></div>
      {q.isLoading ? <Skeleton className="h-48 rounded-2xl" /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {(q.data ?? []).map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-5" data-testid={`card-admin-category-${c.id}`}>
              <div className="flex items-start justify-between">
                <div><div className="text-lg font-bold">{c.name}</div><div className="text-xs text-muted-foreground">أيقونة: {c.icon || "—"} · {num(c.serviceCount)} خدمة</div></div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => open(c)} data-testid={`button-edit-category-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setErr(null); setToDel(c); }} data-testid={`button-delete-category-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{c.subcategories.map((s) => <span key={s} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{s}</span>)}</div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{edit?.id ? "تعديل القسم" : "قسم جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>الاسم</Label><Input data-testid="input-category-name" value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>معرّف الأيقونة (home / user / cpu)</Label><Input dir="ltr" data-testid="input-category-icon" value={edit?.icon ?? ""} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الأقسام الفرعية (افصل بفاصلة)</Label><Input data-testid="input-category-subs" value={subs} onChange={(e) => setSubs(e.target.value)} /></div>
            {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setEdit(null)}>إلغاء</Button><Button data-testid="button-save-category" disabled={(edit?.name ?? "").trim().length < 2 || save.isPending} onClick={submit}>{save.isPending ? "جارٍ الحفظ..." : "حفظ"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!toDel} onOpenChange={(v) => !v && setToDel(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف قسم «{toDel?.name}»؟</AlertDialogTitle><AlertDialogDescription>قد يرفض الخادم الحذف إن كانت هناك خدمات مرتبطة.</AlertDialogDescription></AlertDialogHeader>
          {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
          <AlertDialogFooter className="gap-2"><AlertDialogCancel>تراجع</AlertDialogCancel><AlertDialogAction data-testid="button-confirm-delete-category" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={del.isPending} onClick={(e) => { e.preventDefault(); remove(); }}>{del.isPending ? "جارٍ..." : "حذف"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function OrdersTab() {
  const q = useListOrders();
  if (q.isLoading) return <Skeleton className="h-48 rounded-2xl" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState icon={ClipboardList} title="لا توجد طلبات" />;
  const commission = q.data.filter((o) => o.status === "completed").reduce((a, o) => a + o.commission, 0);
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">عمولة الطلبات المكتملة: <span className="font-bold text-foreground">{sar(commission)}</span></div>
      <div className="divide-y overflow-hidden rounded-2xl border bg-card">{q.data.map((o) => <OrderRow key={o.id} o={o} />)}</div>
    </>
  );
}

function SubsTab() {
  const q = useListSubscriptions();
  if (q.isLoading) return <Skeleton className="h-48 rounded-2xl" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState icon={CreditCard} title="لا توجد اشتراكات" />;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground"><tr className="border-b text-right"><th className="p-3 font-medium">مقدم الخدمة</th><th className="font-medium">الخطة</th><th className="font-medium">المبلغ</th><th className="font-medium">ينتهي</th><th className="font-medium">الحالة</th></tr></thead>
        <tbody>{q.data.map((s) => (
          <tr key={s.id} className="border-b last:border-0"><td className="p-3"><Link href={`/providers/${s.providerId}`} className="text-primary">{s.providerId.slice(0, 10)}</Link></td><td>{planLabel[s.plan]}</td><td className="num">{sar(s.price)}{s.simulated && " (محاكاة)"}</td><td>{date(s.endsAt)}</td><td>{isSubActive(s) ? <span className="text-success">نشط</span> : <span className="text-muted-foreground">منتهٍ</span>}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
