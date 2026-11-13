import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ArrowLeft, ShieldCheck, HandCoins, MessageSquareText, CheckCircle2 } from "lucide-react";
import { useGetMarketplaceStats, useListCategories, useListServices, useListProviders } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicLayout } from "@/components/layout";
import { CardsSkeleton, DemoBadge, EmptyState, ErrorState, ServiceCard, categoryIcon, ProBadge, Rating } from "@/components/common";
import { basePath, imgSrc, initials, num } from "@/lib/format";

export default function Landing() {
  const [q, setQ] = useState("");
  const [, setLocation] = useLocation();
  const stats = useGetMarketplaceStats();
  const cats = useListCategories();
  const services = useListServices({ sort: "rating" });
  const providers = useListProviders();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/services${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="najdi-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <h1 className="rise rise-1 mt-6 font-display text-5xl font-black leading-[1.15] md:text-7xl">
              اطلب خدمتك،
              <br />
              <span className="relative inline-block text-primary">
                واعرض مهارتك.
                <span className="absolute -bottom-1 right-0 left-0 sadu-band-clay rounded" />
              </span>
            </h1>
            <p className="rise rise-2 mt-6 max-w-xl text-lg leading-loose text-muted-foreground">
              وَصل يقرّب المسافة بينك وبين الكهربائي في حيّك، ومدرّسة الرياضيات في الشارع المجاور، ومصمم المواقع الذي يسكن على بُعد دقائق. أسعار واضحة، وتقييمات من طلبات مكتملة فقط.
            </p>
            <form onSubmit={submit} className="rise rise-3 mt-8 flex max-w-xl gap-2 rounded-2xl border bg-card p-2 shadow-md">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input data-testid="input-hero-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="سباكة، تصميم شعار، دروس خصوصية..." className="h-12 border-0 bg-transparent pr-10 text-base shadow-none focus-visible:ring-0" />
              </div>
              <Button data-testid="button-hero-search" type="submit" size="lg" className="h-12 px-6">ابحث</Button>
            </form>
            <div className="rise rise-4 mt-6 flex flex-wrap gap-3 text-sm">
              <Link href="/sign-up" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:gap-2.5 transition-all" data-testid="link-join-provider">
                عندك مهارة؟ ابدأ الكسب منها <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rise rise-2 relative">
            <div className="absolute -inset-3 rotate-2 rounded-[2rem] bg-saffron/25" />
            <img src={`${basePath}/images/hero.png`} alt="حي سعودي" className="relative aspect-[4/3] w-full rounded-[2rem] object-cover shadow-xl" />
            <div className="absolute -bottom-6 right-6 left-6 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur md:left-auto md:w-72">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>في المنصة الآن</span>
                {stats.data?.demo && <DemoBadge />}
              </div>
              {stats.isLoading ? (
                <Skeleton className="mt-3 h-10 w-full" />
              ) : stats.data ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div><div className="font-display text-2xl font-extrabold text-primary num" data-testid="text-stat-providers">{num(stats.data.providers)}</div><div className="text-[11px] text-muted-foreground">مقدم خدمة</div></div>
                  <div><div className="font-display text-2xl font-extrabold text-primary num" data-testid="text-stat-services">{num(stats.data.services)}</div><div className="text-[11px] text-muted-foreground">خدمة</div></div>
                  <div><div className="font-display text-2xl font-extrabold text-primary num">{num(stats.data.completedOrders)}</div><div className="text-[11px] text-muted-foreground">طلب مكتمل</div></div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">تعذّر تحميل الأرقام</div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="font-bold text-clay text-[40px]">الأقسام</div>
          </div>
        </div>
        {cats.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
        ) : cats.error ? (
          <ErrorState error={cats.error} onRetry={() => cats.refetch()} />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(cats.data ?? []).map((c, i) => {
              const Icon = categoryIcon(c, i);
              const tones = ["bg-primary text-primary-foreground", "bg-secondary text-secondary-foreground", "bg-accent text-accent-foreground"];
              return (
                <Link key={c.id} href={`/services?categoryId=${c.id}`} data-testid={`card-category-${c.id}`} className={`lift group relative overflow-hidden rounded-2xl p-6 ${tones[i % 3]}`}>
                  <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-current opacity-[0.07] transition-transform duration-500 group-hover:scale-150" />
                  <Icon className="h-8 w-8" />
                  <h3 className="mt-6 text-2xl font-extrabold">{c.name}</h3>
                  <div className="mt-1 text-sm opacity-75 num">{num(c.serviceCount)} خدمة</div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.subcategories.slice(0, 5).map((s) => (
                      <span key={s} className="rounded-full border border-current/20 px-2.5 py-0.5 text-xs opacity-85">{s}</span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold text-clay">خدمات قريبة منك</div>
            <h2 className="mt-1 text-3xl font-extrabold">ابدأ من هنا</h2>
          </div>
          <Button asChild variant="outline"><Link href="/services" data-testid="link-all-services">تصفح الكل</Link></Button>
        </div>
        {services.isLoading ? <CardsSkeleton n={3} /> : services.error ? (
          <ErrorState error={services.error} onRetry={() => services.refetch()} />
        ) : (services.data ?? []).length === 0 ? (
          <EmptyState title="لا توجد خدمات منشورة بعد" text="كن أول من يعرض مهارته في حيّك." action={<Button asChild><Link href="/sign-up">انضم كمقدم خدمة</Link></Button>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(services.data ?? []).slice(0, 6).map((s) => <ServiceCard key={s.id} s={s} categories={cats.data} />)}
          </div>
        )}
      </section>
      {/* HOW */}
      <section id="how" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 md:px-6">
        <div className="grid gap-10 rounded-[2rem] bg-sidebar p-8 text-sidebar-foreground md:p-14 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="text-xs font-bold text-saffron">كيف يعمل</div>
            <h2 className="mt-2 text-4xl font-extrabold leading-tight">ثلاث خطوات،<br />بلا مفاجآت.</h2>
            <p className="mt-4 leading-loose text-sidebar-foreground/70">ترى سعر الخدمة ورسوم المنصة (10%) والإجمالي قبل أن تؤكد. لا شيء مخفي.</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Search, t: "اختر", d: "ابحث بالاسم أو القسم أو الحي، وقارن الأسعار والتقييمات." },
              { icon: HandCoins, t: "اطلب", d: "اكتب تفاصيل حاجتك وموعدك، وراجع الإجمالي قبل التأكيد." },
              { icon: MessageSquareText, t: "قيّم", d: "بعد اكتمال الطلب، شارك تجربتك ." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-2xl bg-sidebar-accent p-5">
                <div className="flex items-center justify-between">
                  <s.icon className="h-6 w-6 text-saffron" />
                  <span className="font-display text-4xl font-black text-sidebar-foreground/15">{(i + 1).toLocaleString("ar-SA")}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/70">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {/* PROVIDERS */}
      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-6">
        <div className="mb-8">
          <div className="text-xs font-bold text-clay">وجوه من الحي</div>
          <h2 className="mt-1 text-3xl font-extrabold">مقدمو خدمات</h2>
        </div>
        {providers.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
        ) : providers.error ? (
          <ErrorState error={providers.error} onRetry={() => providers.refetch()} />
        ) : (providers.data ?? []).length === 0 ? (
          <EmptyState title="لا يوجد مقدمو خدمات بعد" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(providers.data ?? []).slice(0, 8).map((p) => (
              <Link key={p.id} href={`/providers/${p.id}`} data-testid={`card-provider-${p.id}`} className="lift rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  {p.avatar ? <img src={imgSrc(p.avatar)} alt="" className="h-12 w-12 rounded-full object-cover" /> : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{initials(p.name)}</div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.city}{p.district ? `، ${p.district}` : ""}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {p.professional && <ProBadge />}
                  {p.isDemo && <DemoBadge />}
                </div>
                <div className="mt-3"><Rating rating={p.rating} count={p.reviewCount} /></div>
              </Link>
            ))}
          </div>
        )}
      </section>
      {/* FOR PROVIDERS */}
      <section id="providers" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 md:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="text-xs font-bold text-clay">لأصحاب المهارات</div>
            <h2 className="mt-2 text-4xl font-extrabold leading-tight">مهارتك تستحق دخلًا ثابتًا.</h2>
            <p className="mt-4 leading-loose text-muted-foreground">اشترك شهريًا، ابنِ ملفك المهني، وانشر خدماتك ليصلك أهل مدينتك مباشرة.</p>
            <ul className="mt-6 space-y-3">
              {["خطة أساسية بـ 39 ر.س شهريًا لخمس خدمات", "خطة احترافية بـ 79 ر.س لخمس عشرة خدمة وظهور مميز", "عمولة 10% فقط على الطلبات المكتملة عبر المنصة"].map((t) => (
                <li key={t} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />{t}</li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8"><Link href="/sign-up" data-testid="button-provider-cta">ابدأ كمقدم خدمة</Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src={`${basePath}/images/service-personal.png`} alt="" className="aspect-square w-full rounded-2xl object-cover" />
            <img src={`${basePath}/images/service-tech.png`} alt="" className="mt-10 aspect-square w-full rounded-2xl object-cover" />
          </div>
        </div>
      </section>
      {/* TRUST */}
      <section className="mx-auto mt-24 max-w-4xl px-4 text-center md:px-6">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 text-3xl font-extrabold">ثقة تُبنى بالطلبات الحقيقية</h2>
        <p className="mx-auto mt-3 max-w-2xl leading-loose text-muted-foreground">التقييم متاح فقط لصاحب طلب مكتمل، مرة واحدة. والبيانات التجريبية معلّمة بوضوح حتى تعرف الفرق.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg"><Link href="/services">اطلب خدمتك</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/sign-up">اعرض مهارتك</Link></Button>
        </div>
      </section>
    </PublicLayout>
  );
}
