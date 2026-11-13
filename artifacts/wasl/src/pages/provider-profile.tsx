import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, X, ExternalLink } from "lucide-react";
import {
  useGetMyProviderProfile, getGetMyProviderProfileQueryKey, useSaveProviderProfile, useListCategories, useGetDashboard,
  getGetProviderQueryKey, getListProvidersQueryKey, type User,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout";
import { RequireUser, FullSkeleton } from "@/components/session";
import { ErrorState, PageHeader } from "@/components/common";
import { errMsg, imgSrc, initials, num } from "@/lib/format";
import { useImageUpload } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

export default function ProviderProfile() {
  return <AppShell><RequireUser roles={["provider"]}>{(u) => <Inner user={u} />}</RequireUser></AppShell>;
}

function TagInput({ value, onChange, placeholder, testid }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; testid: string }) {
  const [t, setT] = useState("");
  const add = () => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(""); };
  return (
    <div className="rounded-xl border bg-card p-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary">
            {v}<button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label="إزالة"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input data-testid={testid} value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "،" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} placeholder={placeholder} className="min-w-[8rem] flex-1 bg-transparent px-2 py-1 text-sm outline-none" />
      </div>
    </div>
  );
}

function Inner({ user }: { user: User }) {
  const q = useGetMyProviderProfile();
  const dash = useGetDashboard();
  const cats = useListCategories();
  const save = useSaveProviderProfile();
  const qc = useQueryClient();
  const { toast } = useToast();
  const avatarUp = useImageUpload();
  const portUp = useImageUpload();
  const init = useRef(false);
  const [bio, setBio] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [coverage, setCoverage] = useState<string[]>([]);
  const [experience, setExperience] = useState("0");
  const [avatar, setAvatar] = useState("");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (q.data && !init.current) {
      init.current = true;
      const p = q.data;
      setBio(p.bio); setCategoryId(String(p.categoryId || "")); setSkills(p.skills); setCoverage(p.coverage);
      setExperience(String(p.experience)); setAvatar(p.avatar); setPortfolio(p.portfolio);
    }
  }, [q.data]);

  if (q.isLoading) return <FullSkeleton />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const pro = dash.data?.subscription?.plan === "professional";
  const limit = pro ? 20 : 5;
  const exp = Number(experience);

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (f) { const u = await avatarUp.upload(f); if (u) setAvatar(u); }
  };
  const onPortfolio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (f) { const u = await portUp.upload(f); if (u) setPortfolio((p) => [...p, u].slice(0, limit)); }
  };

  const submit = () => {
    setErr(null);
    save.mutate({ data: { bio: bio.trim(), categoryId: Number(categoryId), skills, coverage, experience: exp, avatar, portfolio: portfolio.slice(0, limit) } }, {
      onSuccess: (p) => {
        qc.setQueryData(getGetMyProviderProfileQueryKey(), p);
        qc.invalidateQueries({ queryKey: getGetProviderQueryKey(p.id) });
        qc.invalidateQueries({ queryKey: getListProvidersQueryKey() });
        toast({ title: "تم حفظ ملفك المهني" });
      },
      onError: (e) => setErr(errMsg(e)),
    });
  };

  return (
    <>
      <PageHeader eyebrow="ملفي المهني" title="كيف يراك العملاء" subtitle="ملف واضح وصادق يقرّب العميل منك."
        actions={<Button asChild variant="outline"><Link href={`/providers/${user.id}`} data-testid="link-view-public"><ExternalLink className="h-4 w-4" /> معاينة الملف العام</Link></Button>} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border bg-card p-6 text-center lg:self-start">
          <div className="relative mx-auto h-32 w-32">
            {avatar ? <img src={imgSrc(avatar)} alt="" className="h-32 w-32 rounded-2xl object-cover" /> : (
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-primary/10 font-display text-4xl font-black text-primary">{initials(user.name)}</div>
            )}
            <label className="absolute -bottom-2 -left-2 cursor-pointer rounded-full bg-primary p-2.5 text-primary-foreground shadow-md transition-transform hover:scale-105">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatar} data-testid="input-avatar" />
            </label>
          </div>
          {avatarUp.uploading && <p className="mt-3 text-xs text-muted-foreground">جارٍ رفع الصورة...</p>}
          {avatarUp.error && <p className="mt-3 text-xs text-destructive">{avatarUp.error}</p>}
          <div className="mt-4 font-bold">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.city}، {user.district}</div>
          {avatar && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAvatar("")}>إزالة الصورة</Button>}
        </div>
        <div className="space-y-6 rounded-2xl border bg-card p-6">
          <div className="space-y-1.5"><Label>نبذة عنك</Label><Textarea data-testid="input-bio" rows={5} maxLength={3000} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="من أنت؟ ماذا تتقن؟" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>القسم الرئيسي</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-profile-category"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{(cats.data ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>سنوات الخبرة</Label><Input data-testid="input-experience" type="number" min={0} max={80} value={experience} onChange={(e) => setExperience(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>المهارات</Label><TagInput testid="input-skills" value={skills} onChange={setSkills} placeholder="اكتب مهارة واضغط Enter" /></div>
          <div className="space-y-1.5"><Label>الأحياء / المدن التي تغطيها</Label><TagInput testid="input-coverage" value={coverage} onChange={setCoverage} placeholder="مثال: حي الملقا" /></div>
          <div>
            <div className="flex items-center justify-between"><Label>معرض الأعمال</Label><span className="text-xs text-muted-foreground num">{num(portfolio.length)} / {num(limit)} {pro ? "(احترافية)" : "(أساسية)"}</span></div>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {portfolio.map((src) => (
                <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border">
                  <img src={imgSrc(src)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => setPortfolio(portfolio.filter((x) => x !== src))} className="absolute left-1 top-1 rounded-full bg-card/90 p-1 opacity-0 transition-opacity group-hover:opacity-100" aria-label="إزالة"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {portfolio.length < limit && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary">
                  <ImagePlus className="h-5 w-5" />{portUp.uploading ? "جارٍ الرفع..." : "إضافة"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPortfolio} disabled={portUp.uploading} data-testid="input-portfolio" />
                </label>
              )}
            </div>
            {portUp.error && <p className="mt-2 text-sm text-destructive">{portUp.error}</p>}
          </div>
          {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-profile-error">{err}</div>}
          <Button size="lg" onClick={submit} disabled={save.isPending || !categoryId || exp < 0 || exp > 80 || avatarUp.uploading || portUp.uploading} data-testid="button-save-profile">{save.isPending ? "جارٍ الحفظ..." : "حفظ الملف"}</Button>
        </div>
      </div>
    </>
  );
}
