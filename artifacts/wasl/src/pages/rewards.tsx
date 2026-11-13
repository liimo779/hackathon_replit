import { useQueryClient } from "@tanstack/react-query";
import { Award, CheckCircle2, Clock3, Gift, History, Star, TicketPercent } from "lucide-react";
import { getGetDashboardQueryKey, getGetRewardsQueryKey, useGetRewards, useRedeemReward, type PointsTransaction } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout";
import { RequireUser, FullSkeleton } from "@/components/session";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { date, errMsg, num } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function RewardsPage() {
  return <AppShell><RequireUser roles={["customer"]}>{() => <RewardsContent />}</RequireUser></AppShell>;
}

function RewardsContent() {
  const query = useGetRewards();
  const redeem = useRedeemReward();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (query.isLoading) return <FullSkeleton />;
  if (!query.data || query.error) return <ErrorState error={query.error} title="تعذر تحميل نقاط وَصل" onRetry={() => query.refetch()} />;
  const rewards = query.data;
  const progress = Math.min(rewards.balance % 100, 100);

  const redeemPoints = () => {
    redeem.mutate({ data: {} }, {
      onSuccess: (coupon) => {
        queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "تهانينا! حصلت على قسيمة خصم", description: `${coupon.code} — خصم ${num(coupon.discountPercent)}٪` });
      },
      onError: (error) => toast({ title: "تعذر استبدال النقاط", description: errMsg(error), variant: "destructive" }),
    });
  };

  return (
    <>
      <PageHeader eyebrow="مكافآت العملاء" title="نقاط وَصل" subtitle="اجمع النقاط من الطلبات المكتملة والتقييمات، واستبدلها بقسائم خصم." />
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-saffron/40 bg-accent/35 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Award className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-muted-foreground">رصيدك الحالي</div>
              <div className="font-display text-3xl font-black text-primary">{num(rewards.balance)} نقطة</div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3 text-sm">
            <span>{rewards.balance >= 100 ? "وصلت إلى مكافأة جديدة!" : `باقي ${num(rewards.pointsToNextReward)} نقطة للمكافأة التالية`}</span>
            <span className="num text-muted-foreground">{num(progress)} / ١٠٠</span>
          </div>
          <div role="progressbar" aria-label="التقدم نحو المكافأة التالية" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-2 h-3 overflow-hidden rounded-full bg-background/80">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">١٠ نقاط عند إكمال الطلب، و٥ نقاط عند تقييمه.</p>
          <Button className="mt-5 w-full sm:w-auto" onClick={redeemPoints} disabled={rewards.balance < 100 || redeem.isPending} data-testid="button-redeem-reward">
            <Gift className="h-4 w-4" /> {redeem.isPending ? "جارٍ إصدار القسيمة..." : "استبدال ١٠٠ نقطة بخصم ١٠٪"}
          </Button>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 font-bold"><TicketPercent className="h-5 w-5 text-clay" /> قسائمك</div>
          {rewards.coupons.length === 0 ? (
            <EmptyState icon={Gift} title="لا توجد قسائم بعد" text="استبدل ١٠٠ نقطة للحصول على قسيمة خصم." />
          ) : (
            <div className="mt-4 space-y-3">
              {rewards.coupons.map((coupon) => (
                <div key={coupon.id} className="rounded-xl border border-dashed p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-lg font-bold tracking-wide">{coupon.code}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coupon.status === "available" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {coupon.status === "available" ? "متاحة" : coupon.status === "used" ? "مستخدمة" : "منتهية"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>خصم {num(coupon.discountPercent)}٪</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> تنتهي {date(coupon.expiresAt)}</span>
                    {coupon.redeemedOrderId && <span>الطلب #{num(coupon.redeemedOrderId)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="flex items-center gap-2 font-bold"><History className="h-5 w-5 text-primary" /> سجل النقاط</h2>
        {rewards.history.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">ستظهر هنا النقاط المكتسبة والمكافآت المستبدلة.</div>
        ) : (
          <ul className="mt-4 divide-y">
            {rewards.history.map((transaction) => <HistoryRow key={transaction.id} transaction={transaction} />)}
          </ul>
        )}
      </section>
    </>
  );
}

function HistoryRow({ transaction }: { transaction: PointsTransaction }) {
  const reason = transaction.reason === "order_completed"
    ? "إكمال طلب"
    : transaction.reason === "review_submitted"
      ? "تقييم خدمة"
      : "استبدال مكافأة";
  const Icon = transaction.reason === "order_completed" ? CheckCircle2 : transaction.reason === "review_submitted" ? Star : Gift;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-clay" />
        <div>
          <div className="text-sm font-semibold">{reason}{transaction.couponCode ? ` · ${transaction.couponCode}` : ""}</div>
          <div className="text-xs text-muted-foreground">{date(transaction.createdAt)}{transaction.orderId ? ` · الطلب #${num(transaction.orderId)}` : ""}</div>
        </div>
      </div>
      <div className={`font-bold num ${transaction.points > 0 ? "text-success" : "text-muted-foreground"}`}>
        {transaction.points > 0 ? "+" : ""}{num(transaction.points)} نقطة
      </div>
    </li>
  );
}
