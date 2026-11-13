import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ShieldAlert, CreditCard } from "lucide-react";
import {
  useListPlans, useListSubscriptions, useSubscribePlan, getListSubscriptionsQueryKey, getGetDashboardQueryKey, getGetMyProviderProfileQueryKey,
  type Plan,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/layout";
import { RequireUser } from "@/components/session";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { date, errMsg, isSubActive, num, planLabel, sar } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Subscriptions() {
  return <AppShell><RequireUser roles={["provider"]}>{() => <Inner />}</RequireUser></AppShell>;
}

function Inner() {
  const plans = useListPlans();
  const subs = useListSubscriptions();
  const m = useSubscribePlan();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [chosen, setChosen] = useState<Plan | null>(null);
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const current = (subs.data ?? []).find((s) => isSubActive(s));

  const pay = () => {
    if (!chosen) return;
    setErr(null);
    m.mutate({ data: { plan: chosen.id, simulatePayment: true } }, {
      onSuccess: (s) => {
        qc.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMyProviderProfileQueryKey() });
        toast({ title: "تم تفعيل الاشتراك (محاكاة)", description: `الخطة ${planLabel[s.plan]} حتى ${date(s.endsAt)}` });
        setChosen(null); setAck(false);
      },
      onError: (e) => setErr(errMsg(e)),
    });
  };

  return (
    <>
      <PageHeader eyebrow="الاشتراك" title="اختر خطتك الشهرية" subtitle="الاشتراك النشط شرط لنشر الخدمات واستقبال الطلبات الجديدة." />
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-dashed border-clay/50 bg-secondary/50 p-4 text-sm text-secondary-foreground">
        <ShieldAlert className="h-5 w-5 shrink-0" /> الدفع هنا محاكاة بالكامل لأغراض النموذج الأولي. لا نطلب بيانات بطاقة ولا تُخصم أي مبالغ.
      </div>
      {current && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-5">
          <CreditCard className="h-6 w-6 text-success" />
          <div><div className="font-bold">اشتراكك الحالي: {planLabel[current.plan]}</div><div className="text-sm text-muted-foreground">ينتهي في {date(current.endsAt)}</div></div>
        </div>
      )}
      {plans.isLoading ? <div className="grid gap-5 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}</div>
        : plans.error ? <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
        : (
          <div className="grid gap-5 md:grid-cols-2">
            {(plans.data ?? []).map((p) => {
              const pro = p.id === "professional";
              const isCurrent = current?.plan === p.id;
              return (
                <div key={p.id} data-testid={`card-plan-${p.id}`} className={cn("relative flex flex-col overflow-hidden rounded-3xl border p-8 rise", pro ? "bg-sidebar text-sidebar-foreground shadow-xl" : "bg-card")}>
                  {pro && <><div className="sadu-band absolute inset-x-0 top-0" /><span className="absolute left-6 top-6 rounded-full bg-saffron px-3 py-1 text-xs font-bold text-sidebar-primary-foreground">الأكثر تميزًا</span></>}
                  <h2 className="text-2xl font-extrabold">{p.name}</h2>
                  <div className="mt-4 flex items-baseline gap-1"><span className="font-display text-5xl font-black num">{num(p.price)}</span><span className={pro ? "text-sidebar-foreground/70" : "text-muted-foreground"}>ر.س / شهريًا</span></div>
                  <div className={cn("mt-1 text-sm", pro ? "text-sidebar-foreground/70" : "text-muted-foreground")}>حتى {num(p.serviceLimit)} خدمة منشورة</div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", pro ? "text-saffron" : "text-success")} />{f}</li>)}
                  </ul>
                  <Button size="lg" variant={pro ? "secondary" : "default"} className={cn("mt-8", pro && "bg-saffron text-sidebar-primary-foreground hover:bg-saffron/90")} onClick={() => { setErr(null); setAck(false); setChosen(p); }} data-testid={`button-subscribe-${p.id}`}>
                    {isCurrent ? "تجديد الخطة" : current ? "التحويل لهذه الخطة" : "اشترك الآن"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

      <h2 className="mb-3 mt-12 text-xl font-bold">سجل الاشتراكات</h2>
      {subs.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : subs.error ? <ErrorState error={subs.error} onRetry={() => subs.refetch()} />
        : (subs.data ?? []).length === 0 ? <EmptyState icon={CreditCard} title="لا يوجد سجل بعد" text="سيظهر هنا كل اشتراك تفعّله." />
        : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr className="border-b text-right"><th className="p-3 font-medium">الخطة</th><th className="font-medium">المبلغ</th><th className="font-medium">من</th><th className="font-medium">إلى</th><th className="font-medium">الحالة</th></tr></thead>
              <tbody>
                {(subs.data ?? []).map((s) => (
                  <tr key={s.id} className="border-b last:border-0" data-testid={`row-sub-${s.id}`}>
                    <td className="p-3 font-semibold">{planLabel[s.plan]}</td><td className="num">{sar(s.price)}{s.simulated && <span className="mr-1 text-[10px] text-muted-foreground">(محاكاة)</span>}</td>
                    <td>{date(s.startsAt)}</td><td>{date(s.endsAt)}</td>
                    <td>{isSubActive(s) ? <span className="text-success font-semibold">نشط</span> : <span className="text-muted-foreground">{s.status === "active" ? "منتهٍ" : s.status}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <AlertDialog open={!!chosen} onOpenChange={(v) => !v && setChosen(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الدفع المحاكى</AlertDialogTitle>
            <AlertDialogDescription>الخطة {chosen?.name} — {sar(chosen?.price)} لمدة شهر.</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} data-testid="checkbox-simulated" className="mt-0.5" />
            أفهم أن هذه عملية دفع محاكاة، لن تُخصم أي مبالغ ولن تُطلب بيانات بطاقة.
          </label>
          {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-payment" disabled={!ack || m.isPending} onClick={(e) => { e.preventDefault(); pay(); }}>{m.isPending ? "جارٍ التفعيل..." : "تأكيد الدفع المحاكى"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
