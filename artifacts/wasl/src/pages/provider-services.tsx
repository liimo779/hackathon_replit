import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Briefcase, ImagePlus, X, AlertTriangle } from "lucide-react";
import {
  useListServices, getListServicesQueryKey, useCreateService, useUpdateService, useDeleteService, useListCategories, useGetDashboard,
  getGetDashboardQueryKey, type Service, type ServiceInputDelivery,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout";
import { RequireUser } from "@/components/session";
import { EmptyState, ErrorState, PageHeader, DemoBadge } from "@/components/common";
import { deliveryLabel, errMsg, fallbackImage, imgSrc, isSubActive, num, sar } from "@/lib/format";
import { useImageUpload } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

export default function ProviderServices() {
  return <AppShell><RequireUser roles={["provider"]}>{() => <Inner />}</RequireUser></AppShell>;
}

const params = { mine: true };

function Inner() {
  const q = useListServices(params);
  const dash = useGetDashboard();
  const cats = useListCategories();
  const qc = useQueryClient();
  const { toast } = useToast();
  const del = useDeleteService();
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);

  const sub = dash.data?.subscription;
  const active = isSubActive(sub);
  const limit = sub?.plan === "professional" ? 15 : 5;
  const count = q.data?.length ?? 0;
  const canCreate = active && count < limit;

  const doDelete = () => {
    if (!toDelete) return;
    setDelErr(null);
    del.mutate({ id: toDelete.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListServicesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "تم حذف الخدمة" });
        setToDelete(null);
      },
      onError: (e) => setDelErr(errMsg(e)),
    });
  };

  return (
    <>
      <PageHeader eyebrow="خدماتي" title="الخدمات المنشورة" subtitle={active ? `استخدمت ${num(count)} من ${num(limit)} خدمات في خطتك.` : undefined}
        actions={<Button data-testid="button-add-service" disabled={!canCreate} onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> خدمة جديدة</Button>} />
      {!dash.isLoading && !active && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-destructive" /><div><div className="font-semibold">لا يوجد اشتراك نشط</div><div className="text-sm text-muted-foreground">لا يمكنك نشر خدمات أو استقبال طلبات جديدة حتى تفعّل اشتراكك.</div></div></div>
          <Button asChild><Link href="/subscriptions">تفعيل الاشتراك</Link></Button>
        </div>
      )}
      {active && count >= limit && <div className="mb-6 rounded-xl bg-accent p-4 text-sm text-accent-foreground">وصلت للحد الأقصى في خطتك. <Link href="/subscriptions" className="font-semibold underline">رقِّ إلى الاحترافية</Link> لنشر حتى 15 خدمة.</div>}
      {q.isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
        : count === 0 ? <EmptyState icon={Briefcase} title="لم تنشر أي خدمة بعد" text="خدمة واحدة واضحة السعر تكفي لتبدأ." action={canCreate ? <Button onClick={() => setEditing("new")}>أضف أول خدمة</Button> : undefined} />
        : (
          <div className="space-y-3">
            {(q.data ?? []).map((s) => {
              const idx = Math.max(0, (cats.data ?? []).findIndex((c) => c.id === s.categoryId));
              return (
                <div key={s.id} data-testid={`card-my-service-${s.id}`} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
                  <img src={s.images[0] ? imgSrc(s.images[0]) : fallbackImage(idx)} alt="" className="h-24 w-full rounded-xl object-cover sm:w-32" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><Link href={`/services/${s.id}`} className="font-bold hover:text-primary">{s.title}</Link>{s.isDemo && <DemoBadge />}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{cats.data?.find((c) => c.id === s.categoryId)?.name} · {deliveryLabel[s.delivery]} · {s.duration}</div>
                    <div className="mt-1 font-display font-extrabold text-primary">{sar(s.price)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(s)} data-testid={`button-edit-service-${s.id}`}><Pencil className="h-4 w-4" /> تعديل</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setDelErr(null); setToDelete(s); }} data-testid={`button-delete-service-${s.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      {editing && <ServiceDialog key={editing === "new" ? "new" : editing.id} service={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف «{toDelete?.title}»؟</AlertDialogTitle>
            <AlertDialogDescription>ستختفي الخدمة من السوق. الطلبات السابقة تبقى محفوظة.</AlertDialogDescription>
          </AlertDialogHeader>
          {delErr && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{delErr}</div>}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-delete" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={del.isPending} onClick={(e) => { e.preventDefault(); doDelete(); }}>{del.isPending ? "جارٍ الحذف..." : "حذف"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ServiceDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const cats = useListCategories();
  const create = useCreateService();
  const update = useUpdateService();
  const up = useImageUpload();
  const [f, setF] = useState({
    title: service?.title ?? "", description: service?.description ?? "", categoryId: service ? String(service.categoryId) : "",
    price: service ? String(service.price) : "", duration: service?.duration ?? "", delivery: (service?.delivery ?? "customer_location") as ServiceInputDelivery,
  });
  const [images, setImages] = useState<string[]>(service?.images ?? []);
  const [err, setErr] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const price = Number(f.price);
  const valid = f.title.trim().length >= 3 && f.description.trim().length >= 10 && f.categoryId && price >= 1 && price <= 100000 && f.duration.trim();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await up.upload(file);
    if (url) setImages((x) => [...x, url].slice(0, 8));
  };

  const save = () => {
    setErr(null);
    const data = { title: f.title.trim(), description: f.description.trim(), categoryId: Number(f.categoryId), price, duration: f.duration.trim(), delivery: f.delivery, images };
    const opts = {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListServicesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: service ? "تم حفظ التعديلات" : "تم نشر الخدمة" });
        onClose();
      },
      onError: (e: unknown) => setErr(errMsg(e)),
    };
    if (service) update.mutate({ id: service.id, data }, opts);
    else create.mutate({ data }, opts);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{service ? "تعديل الخدمة" : "خدمة جديدة"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5"><Label>العنوان</Label><Input data-testid="input-service-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="تركيب وصيانة مكيفات سبليت" /></div>
          <div className="space-y-1.5"><Label>الوصف</Label><Textarea data-testid="input-service-description" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="ما الذي يشمله السعر؟ ما الذي لا يشمله؟" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>القسم</Label>
              <Select value={f.categoryId} onValueChange={(v) => setF({ ...f, categoryId: v })}>
                <SelectTrigger data-testid="select-service-category"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{(cats.data ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>طريقة التنفيذ</Label>
              <Select value={f.delivery} onValueChange={(v) => setF({ ...f, delivery: v as ServiceInputDelivery })}>
                <SelectTrigger data-testid="select-service-delivery"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(deliveryLabel).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>السعر (ر.س)</Label><Input data-testid="input-service-price" type="number" min={1} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المدة</Label><Input data-testid="input-service-duration" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} placeholder="ساعتان" /></div>
          </div>
          <div>
            <Label>الصور ({num(images.length)}/8)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((src) => (
                <div key={src} className="group relative h-20 w-24 overflow-hidden rounded-lg border">
                  <img src={imgSrc(src)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => setImages(images.filter((x) => x !== src))} className="absolute left-1 top-1 rounded-full bg-card/90 p-1 opacity-0 transition-opacity group-hover:opacity-100" aria-label="إزالة"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {images.length < 8 && (
                <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary">
                  <ImagePlus className="h-5 w-5" />{up.uploading ? "جارٍ الرفع..." : "إضافة"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} disabled={up.uploading} data-testid="input-service-image" />
                </label>
              )}
            </div>
            {up.error && <p className="mt-2 text-sm text-destructive">{up.error}</p>}
          </div>
          {price > 0 && <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">سيرى العميل: {sar(price)} + رسوم منصة {sar(price * 0.1)} = {sar(price * 1.1)}</div>}
          {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-service-error">{err}</div>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button data-testid="button-save-service" disabled={!valid || pending || up.uploading} onClick={save}>{pending ? "جارٍ الحفظ..." : service ? "حفظ" : "نشر"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
