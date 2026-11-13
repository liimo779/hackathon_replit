import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Show } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Clock, Truck, ArrowRight, Receipt, CheckCircle2 } from "lucide-react";
import {
  useGetService, getGetServiceQueryKey, useCreateOrder, useListCategories, getListOrdersQueryKey, getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PublicLayout } from "@/components/layout";
import { DemoBadge, ErrorState, ProBadge, Rating } from "@/components/common";
import { useSession } from "@/components/session";
import { deliveryLabel, errMsg, fallbackImage, imgSrc, sar } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function ServiceDetail() {
  const params = useParams();
  const id = Number(params.id);
  const svc = useGetService(id, { query: { enabled: !!id, queryKey: getGetServiceQueryKey(id) } });
  const cats = useListCategories();
  const [active, setActive] = useState(0);

  if (svc.isLoading)
    return (
      <PublicLayout>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </PublicLayout>
    );
  if (svc.error || !svc.data)
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={svc.error} title="الخدمة غير متاحة" onRetry={() => svc.refetch()} /></div>
      </PublicLayout>
    );

  const s = svc.data;
  const idx = Math.max(0, (cats.data ?? []).findIndex((c) => c.id === s.categoryId));
  const cat = cats.data?.find((c) => c.id === s.categoryId);
  const images = s.images.length ? s.images.map(imgSrc) : [fallbackImage(idx)];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Link href="/services" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary" data-testid="link-back-services">
          <ArrowRight className="h-4 w-4" /> العودة للخدمات
        </Link>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="rise">
            <div className="overflow-hidden rounded-2xl border bg-muted">
              <img src={images[active]} alt={s.title} className="aspect-[4/3] w-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((im, i) => (
                  <button key={im + i} onClick={() => setActive(i)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-primary" : "border-transparent opacity-70"}`}>
                    <img src={im} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-2">
              {cat && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{cat.name}</span>}
              {s.professional && <ProBadge />}
              {s.isDemo && <DemoBadge />}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold md:text-4xl" data-testid="text-service-title">{s.title}</h1>
            <div className="mt-3"><Rating rating={s.rating} count={s.reviewCount} /></div>
            <p className="mt-6 whitespace-pre-line leading-loose text-foreground/85">{s.description}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: MapPin, l: "الموقع", v: `${s.city}${s.district ? `، ${s.district}` : ""}` },
                { icon: Clock, l: "المدة", v: s.duration },
                { icon: Truck, l: "طريقة التنفيذ", v: deliveryLabel[s.delivery] },
              ].map((x) => (
                <div key={x.l} className="rounded-xl border bg-card p-4">
                  <x.icon className="h-5 w-5 text-clay" />
                  <div className="mt-2 text-xs text-muted-foreground">{x.l}</div>
                  <div className="font-semibold">{x.v}</div>
                </div>
              ))}
            </div>
            <Link href={`/providers/${s.providerId}`} data-testid="link-provider" className="lift mt-6 flex items-center justify-between rounded-2xl border bg-card p-5">
              <div>
                <div className="text-xs text-muted-foreground">مقدم الخدمة</div>
                <div className="text-lg font-bold">{s.providerName}</div>
              </div>
              <span className="text-sm font-semibold text-primary">عرض الملف</span>
            </Link>
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <OrderPanel serviceId={s.id} price={s.price} isDemo={s.isDemo} remote={s.delivery === "remote"} />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function OrderPanel({ serviceId, price, isDemo, remote }: { serviceId: number; price: number; isDemo: boolean; remote: boolean }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const create = useCreateOrder();
  const [description, setDescription] = useState("");
  const [location, setLoc] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fee = Math.round(Math.round(price * 100) / 10) / 100;
  const total = Math.round((price + fee) * 100) / 100;
  const valid = description.trim().length >= 5 && (remote || location.trim().length >= 3);

  const submit = () => {
    setErr(null);
    create.mutate(
      { data: { serviceId, description: description.trim(), location: location.trim(), scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined } },
      {
        onSuccess: (o) => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "تم إرسال طلبك", description: `الإجمالي ${sar(o.total)} — بانتظار قبول مقدم الخدمة.` });
          setLocation(`/orders/${o.id}`);
        },
        onError: (e) => { setErr(errMsg(e)); setConfirm(false); },
      },
    );
  };

  const breakdown = (
    <div className="space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">سعر الخدمة</span><span className="num">{sar(price)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">رسوم المنصة (10%)</span><span className="num">{sar(fee)}</span></div>
      <div className="flex justify-between border-t border-dashed pt-2 text-base font-bold"><span>الإجمالي</span><span className="num text-primary" data-testid="text-order-total">{sar(total)}</span></div>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-md">
      <div className="sadu-band -mx-6 -mt-6 mb-6 rounded-t-2xl" />
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">يبدأ من</span>
        <span className="font-display text-3xl font-black text-primary num">{sar(price)}</span>
      </div>
      <Show when="signed-out">
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">سجّل دخولك كعميل لإرسال طلب لهذه الخدمة.</p>
        <div className="mt-4 grid gap-2">
          <Button asChild data-testid="button-signin-to-order"><Link href="/sign-in">تسجيل الدخول للطلب</Link></Button>
          <Button asChild variant="outline"><Link href="/sign-up">إنشاء حساب</Link></Button>
        </div>
      </Show>
      <Show when="signed-in">
        {!user ? (
          <div className="mt-4 text-sm text-muted-foreground">أكمل ملفك أولًا. <Link href="/onboarding" className="font-semibold text-primary">إكمال التسجيل</Link></div>
        ) : user.role !== "customer" ? (
          <div className="mt-4 rounded-xl bg-accent p-4 text-sm text-accent-foreground">الطلب متاح لحسابات العملاء فقط.</div>
        ) : (
          <div className="mt-5 space-y-4">
            {isDemo && <div className="text-xs text-muted-foreground"><DemoBadge /> هذه خدمة تجريبية للعرض.</div>}
            <div className="space-y-1.5">
              <Label htmlFor="desc">ماذا تحتاج بالضبط؟</Label>
              <Textarea id="desc" data-testid="input-order-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: تسريب تحت مغسلة المطبخ منذ يومين" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">الموقع / العنوان {remote ? "(اختياري للخدمات عن بُعد)" : ""}</Label>
              <Input id="loc" data-testid="input-order-location" value={location} onChange={(e) => setLoc(e.target.value)} placeholder={remote ? "الخدمة تقدم عن بُعد" : "الرياض، حي النرجس، شارع..."} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="when">الموعد المفضل (اختياري)</Label>
              <Input id="when" type="datetime-local" data-testid="input-order-schedule" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            {breakdown}
            <p className="rounded-lg bg-accent p-3 text-xs text-accent-foreground">الدفع تجريبي بالكامل. لا يُخصم أي مبلغ حقيقي ولا تُطلب بيانات بطاقة.</p>
            <p className="text-[11px] text-muted-foreground">يحتسب الخادم المبلغ النهائي عند الإرسال.</p>
            {err && <div data-testid="text-order-error" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
            <Button className="w-full" size="lg" disabled={!valid} onClick={() => setConfirm(true)} data-testid="button-review-order">
              <Receipt className="h-4 w-4" /> مراجعة الطلب
            </Button>
          </div>
        )}
      </Show>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الطلب</AlertDialogTitle>
            <AlertDialogDescription>راجع المبالغ قبل الإرسال. تُسجل عملية دفع تجريبية فقط، دون خصم أي مبلغ حقيقي.</AlertDialogDescription>
          </AlertDialogHeader>
          {breakdown}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="button-cancel-confirm">رجوع</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-order" disabled={create.isPending} onClick={(e) => { e.preventDefault(); submit(); }}>
              <CheckCircle2 className="h-4 w-4" /> {create.isPending ? "جارٍ الإرسال..." : "تأكيد وإرسال"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
