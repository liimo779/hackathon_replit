import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useListCategories, useListServices, type ListServicesParams, type ListServicesSort } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicLayout } from "@/components/layout";
import { CardsSkeleton, EmptyState, ErrorState, PageHeader, ServiceCard } from "@/components/common";
import { num } from "@/lib/format";

export default function ServicesPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const sp = useMemo(() => new URLSearchParams(search), [search]);

  const [text, setText] = useState(sp.get("search") ?? "");
  const [city, setCity] = useState(sp.get("city") ?? "");
  const [district, setDistrict] = useState(sp.get("district") ?? "");
  const categoryId = sp.get("categoryId") ?? "all";
  const sort = (sp.get("sort") as ListServicesSort) ?? "rating";

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(search);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    const s = next.toString();
    setLocation(`/services${s ? `?${s}` : ""}`, { replace: true });
  };

  // debounce text filters into URL
  useEffect(() => {
    const t = setTimeout(() => {
      const cur = new URLSearchParams(search);
      if ((cur.get("search") ?? "") !== text || (cur.get("city") ?? "") !== city || (cur.get("district") ?? "") !== district) {
        update({ search: text.trim() || undefined, city: city.trim() || undefined, district: district.trim() || undefined });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, city, district]);

  const params: ListServicesParams = useMemo(() => {
    const p: ListServicesParams = { sort };
    if (sp.get("search")) p.search = sp.get("search")!;
    if (sp.get("city")) p.city = sp.get("city")!;
    if (sp.get("district")) p.district = sp.get("district")!;
    if (categoryId !== "all") p.categoryId = Number(categoryId);
    return p;
  }, [sp, sort, categoryId]);

  const cats = useListCategories();
  const services = useListServices(params);
  const hasFilters = !!(params.search || params.city || params.district || params.categoryId);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <PageHeader eyebrow="السوق" title="تصفح الخدمات" subtitle="ابحث باسم الخدمة أو مقدمها، وصفِّ النتائج حسب القسم والمدينة والحي." />

        <div className="sticky top-16 z-20 -mx-4 mb-8 border-y bg-background/90 px-4 py-4 backdrop-blur md:mx-0 md:rounded-2xl md:border">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input data-testid="input-search" value={text} onChange={(e) => setText(e.target.value)} placeholder="اسم الخدمة أو مقدمها" className="pr-9" />
            </div>
            <Select value={categoryId} onValueChange={(v) => update({ categoryId: v === "all" ? undefined : v })}>
              <SelectTrigger data-testid="select-category"><SelectValue placeholder="القسم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {(cats.data ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input data-testid="input-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" />
            <Input data-testid="input-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="الحي" />
            <Select value={sort} onValueChange={(v) => update({ sort: v })}>
              <SelectTrigger data-testid="select-sort"><SlidersHorizontal className="h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">الأعلى تقييمًا</SelectItem>
                <SelectItem value="price">الأقل سعرًا</SelectItem>
                <SelectItem value="newest">الأحدث</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cats.data && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cats.data.find((c) => String(c.id) === categoryId)?.subcategories.map((s) => (
                <button key={s} onClick={() => setText(s)} className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary">{s}</button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span data-testid="text-result-count">{services.data ? `${num(services.data.length)} نتيجة` : "\u00a0"}</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" data-testid="button-clear-filters" onClick={() => { setText(""); setCity(""); setDistrict(""); setLocation("/services", { replace: true }); }}>
              <X className="h-4 w-4" /> مسح الفلاتر
            </Button>
          )}
        </div>

        {services.isLoading ? <CardsSkeleton /> : services.error ? (
          <ErrorState error={services.error} onRetry={() => services.refetch()} />
        ) : (services.data ?? []).length === 0 ? (
          <EmptyState icon={Search} title="لا توجد خدمات مطابقة" text="جرّب كلمة أخرى أو وسّع نطاق المدينة والحي." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(services.data ?? []).map((s) => <ServiceCard key={s.id} s={s} categories={cats.data} />)}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
