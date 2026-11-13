import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Wrench, Lock } from "lucide-react";
import { useSaveAccount, useListCategories, getGetMeQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FullSkeleton, useSession } from "@/components/session";
import { ErrorState, Logo } from "@/components/common";
import { cn } from "@/lib/utils";
import { errMsg } from "@/lib/format";

export default function Onboarding() {
  const s = useSession();
  const cats = useListCategories();
  const save = useSaveAccount();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<"customer" | "provider" | null>(null);
  const [f, setF] = useState({ name: "", phone: "", city: "", district: "" });
  const [categoryId, setCategoryId] = useState("");
  const [terms, setTerms] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (s.isLoading) return <div className="mx-auto max-w-3xl p-8"><FullSkeleton /></div>;
  if (s.error) return <div className="mx-auto max-w-3xl p-8"><ErrorState error={s.error} onRetry={() => s.refetch()} /></div>;
  if (!s.authenticated) return <Redirect to="/sign-in" />;
  if (s.user) return <Redirect to="/dashboard" />;

  const errors = {
    name: f.name.trim().length < 2 ? "الاسم حرفان على الأقل" : null,
    phone: f.phone.trim().length < 9 ? "رقم الجوال 9 خانات على الأقل" : null,
    city: f.city.trim().length < 2 ? "أدخل المدينة" : null,
    district: f.district.trim().length < 2 ? "أدخل الحي" : null,
  };
  const valid = role && !Object.values(errors).some(Boolean) && terms && (role === "customer" || categoryId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !role) return;
    setErr(null);
    save.mutate(
      { data: { ...f, name: f.name.trim(), phone: f.phone.trim(), city: f.city.trim(), district: f.district.trim(), role, termsAccepted: true, categoryId: role === "provider" ? Number(categoryId) : undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setLocation(role === "provider" ? "/subscriptions" : "/dashboard");
        },
        onError: (e) => setErr(errMsg(e)),
      },
    );
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="najdi-pattern min-h-[100dvh] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <form onSubmit={submit} className="rise overflow-hidden rounded-3xl border bg-card shadow-lg">
          <div className="sadu-band" />
          <div className="space-y-8 p-6 md:p-10">
            <div>
              <h1 className="text-3xl font-extrabold">لنكمل ملفك</h1>
              <p className="mt-2 text-muted-foreground">خطوة واحدة وتبدأ. اختر دورك بعناية، فهو ثابت ولا يمكن تغييره لاحقًا.</p>
            </div>
            <div>
              <Label className="mb-3 block">دورك في وَصل</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { v: "customer" as const, icon: ShoppingBag, t: "أطلب خدمات", d: "أبحث عن مقدمي خدمات وأرسل طلبات." },
                  { v: "provider" as const, icon: Wrench, t: "أعرض مهارتي", d: "أشترك، أنشر خدماتي، وأستقبل الطلبات." },
                ].map((o) => (
                  <button type="button" key={o.v} data-testid={`button-role-${o.v}`} onClick={() => setRole(o.v)}
                    className={cn("rounded-2xl border-2 p-5 text-right transition-all", role === o.v ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40")}>
                    <o.icon className={cn("h-7 w-7", role === o.v ? "text-primary" : "text-muted-foreground")} />
                    <div className="mt-3 text-lg font-bold">{o.t}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{o.d}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> لا يمكن تعديل الدور بعد الحفظ.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([["name", "الاسم الكامل", "text"], ["phone", "رقم الجوال", "tel"], ["city", "المدينة", "text"], ["district", "الحي", "text"]] as const).map(([k, l, t]) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={k}>{l}</Label>
                  <Input id={k} type={t} data-testid={`input-${k}`} value={f[k]} onChange={set(k)} dir={k === "phone" ? "ltr" : undefined} className={k === "phone" ? "text-right" : undefined} />
                  {f[k] && errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
                </div>
              ))}
            </div>
            {role === "provider" && (
              <div className="space-y-1.5 rise">
                <Label>القسم الرئيسي لمهارتك</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger data-testid="select-onboarding-category"><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                  <SelectContent>{(cats.data ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <label className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm">
              <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} data-testid="checkbox-terms" className="mt-0.5" />
              <span>قرأت <Link href="/terms" className="font-semibold text-primary underline">الشروط والأحكام</Link> وأوافق عليها، بما فيها رسوم المنصة 10% وطبيعة النموذج التجريبي.</span>
            </label>
            {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-onboarding-error">{err}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={!valid || save.isPending} data-testid="button-submit-onboarding">
              {save.isPending ? "جارٍ الحفظ..." : "حفظ والمتابعة"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
