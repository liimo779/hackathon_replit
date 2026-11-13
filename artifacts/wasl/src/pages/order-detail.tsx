import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Star, Check, CalendarClock, MapPin } from "lucide-react";
import {
  useGetOrder, getGetOrderQueryKey, useUpdateOrderStatus, useCreateReview, getListOrdersQueryKey, getGetDashboardQueryKey,
  type Order, type OrderStatusInputStatus, type User,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/layout";
import { RequireUser, FullSkeleton } from "@/components/session";
import { DemoBadge, ErrorState, StatusBadge } from "@/components/common";
import { date, errMsg, sar, statusLabel } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function OrderDetail() {
  return <AppShell><RequireUser>{(u) => <Inner user={u} />}</RequireUser></AppShell>;
}

const flow: Order["status"][] = ["new", "accepted", "in_progress", "completed"];

function Inner({ user }: { user: User }) {
  const { id: raw } = useParams();
  const id = Number(raw);
  const q = useGetOrder(id, {
    query: { enabled: !!id, queryKey: getGetOrderQueryKey(id), refetchInterval: (query) => (query.state.dataUpdateCount < 30 ? 15000 : false) },
  });
  if (q.isLoading) return <FullSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} title="الطلب غير متاح" onRetry={() => q.refetch()} />;
  const o = q.data;
  const stepIdx = flow.indexOf(o.status);

  return (
    <>
      <Link href="/orders" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="h-4 w-4" /> كل الطلبات</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold" data-testid="text-order-title">{o.serviceTitle}</h1>
        <StatusBadge status={o.status} />
        {o.isDemo && <DemoBadge />}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">طلب #{o.id} · {date(o.createdAt)}</div>

      {o.status !== "cancelled" ? (
        <ol className="mt-8 grid grid-cols-4 gap-2">
          {flow.map((s, i) => (
            <li key={s} className="text-center">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= stepIdx ? "bg-primary" : "bg-muted")} />
              <div className={cn("mt-2 text-xs", i <= stepIdx ? "font-semibold text-primary" : "text-muted-foreground")}>{statusLabel[s]}</div>
            </li>
          ))}
        </ol>
      ) : <div className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">تم إلغاء هذا الطلب.</div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><div className="text-xs text-muted-foreground">العميل</div><div className="font-semibold">{o.customerName}</div></div>
            <div><div className="text-xs text-muted-foreground">مقدم الخدمة</div><Link href={`/providers/${o.providerId}`} className="font-semibold text-primary">{o.providerName}</Link></div>
            <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 text-clay" /><div><div className="text-xs text-muted-foreground">الموقع</div><div>{o.location || "—"}</div></div></div>
            <div className="flex gap-2"><CalendarClock className="mt-0.5 h-4 w-4 text-clay" /><div><div className="text-xs text-muted-foreground">الموعد</div><div>{o.scheduledAt ? new Date(o.scheduledAt).toLocaleString("ar-SA-u-ca-gregory") : "غير محدد"}</div></div></div>
          </div>
          <div className="border-t pt-4">
            <div className="text-xs text-muted-foreground">تفاصيل الطلب</div>
            <p className="mt-1 whitespace-pre-line leading-loose">{o.description}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border bg-card p-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">سعر الخدمة</span><span className="num">{sar(o.price)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">رسوم المنصة</span><span className="num">{sar(o.commission)}</span></div>
            <div className="flex justify-between border-t border-dashed pt-2 text-base font-bold"><span>الإجمالي</span><span className="num text-primary">{sar(o.total)}</span></div>
          </div>
          <Actions o={o} user={user} />
        </div>
      </div>
      {user.role === "customer" && o.customerId === user.id && o.status === "completed" && !o.reviewed && <ReviewForm o={o} />}
      {o.reviewed && <div className="mt-6 flex items-center gap-2 rounded-xl bg-success/10 p-4 text-sm text-success"><Check className="h-4 w-4" /> تم تقييم هذا الطلب. شكرًا لك.</div>}
    </>
  );
}

function Actions({ o, user }: { o: Order; user: User }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useUpdateOrderStatus();
  const [pending, setPending] = useState<OrderStatusInputStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isProvider = user.role === "provider" && o.providerId === user.id;
  const isCustomer = user.role === "customer" && o.customerId === user.id;
  const actions: Array<{ s: OrderStatusInputStatus; l: string; danger?: boolean }> = [];
  if (isProvider) {
    if (o.status === "new") actions.push({ s: "accepted", l: "قبول الطلب" }, { s: "cancelled", l: "رفض الطلب", danger: true });
    if (o.status === "accepted") actions.push({ s: "in_progress", l: "بدء التنفيذ" });
    if (o.status === "in_progress") actions.push({ s: "completed", l: "تأكيد الاكتمال" });
  }
  if (isCustomer && (o.status === "new" || o.status === "accepted")) actions.push({ s: "cancelled", l: "إلغاء الطلب", danger: true });
  if (!actions.length) return null;

  const run = () => {
    if (!pending) return;
    setErr(null);
    m.mutate({ id: o.id, data: { status: pending } }, {
      onSuccess: (upd) => {
        qc.setQueryData(getGetOrderQueryKey(o.id), upd);
        qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "تم تحديث الحالة", description: statusLabel[upd.status] });
        setPending(null);
      },
      onError: (e) => { setErr(errMsg(e)); setPending(null); },
    });
  };
  const label = actions.find((a) => a.s === pending)?.l;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="mb-3 text-sm font-bold">الإجراءات</div>
      <div className="grid gap-2">
        {actions.map((a) => (
          <Button key={a.s} variant={a.danger ? "outline" : "default"} className={a.danger ? "border-destructive/40 text-destructive hover:bg-destructive/5" : ""} onClick={() => setPending(a.s)} data-testid={`button-status-${a.s}`}>{a.l}</Button>
        ))}
      </div>
      {err && <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
      <AlertDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{label}؟</AlertDialogTitle>
            <AlertDialogDescription>{pending === "cancelled" ? "لا يمكن التراجع عن هذا الإجراء." : `ستنتقل حالة الطلب إلى «${pending ? statusLabel[pending] : ""}».`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-status" disabled={m.isPending} onClick={(e) => { e.preventDefault(); run(); }}>{m.isPending ? "جارٍ..." : "تأكيد"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReviewForm({ o }: { o: Order }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useCreateReview();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    setErr(null);
    m.mutate({ id: o.id, data: { rating, comment: comment.trim() } }, {
      onSuccess: () => {
        qc.setQueryData(getGetOrderQueryKey(o.id), { ...o, reviewed: true });
        qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "شكرًا لتقييمك" });
      },
      onError: (e) => setErr(errMsg(e)),
    });
  };
  return (
    <div className="mt-8 rounded-2xl border border-saffron/40 bg-accent/40 p-6 rise">
      <h2 className="text-xl font-bold">كيف كانت التجربة؟</h2>
      <div className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} data-testid={`button-star-${n}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="transition-transform hover:scale-110" aria-label={`${n}`}>
            <Star className={cn("h-8 w-8", n <= (hover || rating) ? "fill-saffron text-saffron" : "text-border")} />
          </button>
        ))}
      </div>
      <Textarea className="mt-4 bg-card" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب ملاحظتك لمساعدة جيرانك" data-testid="input-review-comment" />
      {err && <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
      <Button className="mt-4" disabled={!rating || comment.trim().length < 3 || m.isPending} onClick={submit} data-testid="button-submit-review">{m.isPending ? "جارٍ الإرسال..." : "إرسال التقييم"}</Button>
    </div>
  );
}
