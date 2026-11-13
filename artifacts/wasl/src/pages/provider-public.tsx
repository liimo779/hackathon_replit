import { useParams } from "wouter";
import { MapPin, Briefcase, Eye, Star } from "lucide-react";
import { useGetProvider, getGetProviderQueryKey, useListCategories } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicLayout } from "@/components/layout";
import { DemoBadge, EmptyState, ErrorState, ProBadge, Rating, ServiceCard } from "@/components/common";
import { date, imgSrc, initials, num } from "@/lib/format";

export default function ProviderPublic() {
  const { id = "" } = useParams();
  const q = useGetProvider(id, { query: { enabled: !!id, queryKey: getGetProviderQueryKey(id) } });
  const cats = useListCategories();

  if (q.isLoading) return <PublicLayout><div className="mx-auto max-w-6xl space-y-6 px-4 py-10"><Skeleton className="h-56 rounded-3xl" /><Skeleton className="h-64 rounded-2xl" /></div></PublicLayout>;
  if (q.error || !q.data) return <PublicLayout><div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={q.error} title="الملف غير متاح" onRetry={() => q.refetch()} /></div></PublicLayout>;

  const { provider: p, services, reviews } = q.data;
  const cat = cats.data?.find((c) => c.id === p.categoryId);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-sidebar p-8 text-sidebar-foreground md:p-10 rise">
          <div className="najdi-pattern absolute inset-0 opacity-30" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
            {p.avatar ? <img src={imgSrc(p.avatar)} alt="" className="h-28 w-28 rounded-2xl object-cover ring-4 ring-saffron/40" /> : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-saffron font-display text-4xl font-black text-sidebar-primary-foreground">{initials(p.name)}</div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {p.professional && <ProBadge />}
                {p.isDemo && <DemoBadge />}
                {!p.active && <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs">غير نشط حاليًا</span>}
              </div>
              <h1 className="mt-2 text-3xl font-extrabold md:text-4xl" data-testid="text-provider-name">{p.name}</h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-sidebar-foreground/75">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{p.city}{p.district ? `، ${p.district}` : ""}</span>
                {cat && <span>{cat.name}</span>}
                <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{num(p.experience)} سنوات خبرة</span>
                <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" />{num(p.views)} مشاهدة</span>
              </div>
            </div>
            <div className="rounded-2xl bg-sidebar-accent p-4 text-center">
              {p.reviewCount ? (
                <>
                  <div className="flex items-center justify-center gap-1 font-display text-3xl font-black"><Star className="h-6 w-6 fill-saffron text-saffron" />{p.rating.toFixed(1)}</div>
                  <div className="text-xs text-sidebar-foreground/60">{num(p.reviewCount)} تقييم</div>
                </>
              ) : <div className="text-sm text-sidebar-foreground/70">لا توجد تقييمات بعد</div>}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_2fr]">
          <aside className="space-y-6">
            <section>
              <h2 className="mb-2 text-lg font-bold">نبذة</h2>
              <p className="whitespace-pre-line leading-loose text-muted-foreground">{p.bio || "لم يضف مقدم الخدمة نبذة بعد."}</p>
            </section>
            {p.skills.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-bold">المهارات</h2>
                <div className="flex flex-wrap gap-2">{p.skills.map((s) => <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{s}</span>)}</div>
              </section>
            )}
            {p.coverage.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-bold">نطاق التغطية</h2>
                <div className="flex flex-wrap gap-2">{p.coverage.map((s) => <span key={s} className="rounded-full border px-3 py-1 text-sm">{s}</span>)}</div>
              </section>
            )}
          </aside>
          <div className="space-y-10">
            {p.portfolio.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold">معرض الأعمال</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {p.portfolio.map((src) => <img key={src} src={imgSrc(src)} alt="" className="aspect-square w-full rounded-xl object-cover" loading="lazy" />)}
                </div>
              </section>
            )}
            <section>
              <h2 className="mb-4 text-xl font-bold">الخدمات</h2>
              {services.length === 0 ? <EmptyState title="لا توجد خدمات منشورة" /> : (
                <div className="grid gap-5 sm:grid-cols-2">{services.map((s) => <ServiceCard key={s.id} s={s} categories={cats.data} />)}</div>
              )}
            </section>
            <section>
              <h2 className="mb-4 text-xl font-bold">التقييمات</h2>
              {reviews.length === 0 ? <EmptyState icon={Star} title="لا توجد تقييمات بعد" text="تظهر التقييمات هنا بعد اكتمال الطلبات." /> : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border bg-card p-5" data-testid={`review-${r.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{r.customerName}</span>
                        <span className="text-xs text-muted-foreground">{date(r.createdAt)}</span>
                      </div>
                      <div className="mt-1 flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-saffron text-saffron" : "text-border"}`} />)}</div>
                      <p className="mt-2 leading-relaxed text-foreground/85">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2"><Rating rating={p.rating} count={p.reviewCount} /></div>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
