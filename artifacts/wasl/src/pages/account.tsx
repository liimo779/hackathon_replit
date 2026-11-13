import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useSaveAccount, getGetMeQueryKey, type User } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/layout";
import { RequireUser } from "@/components/session";
import { PageHeader } from "@/components/common";
import { errMsg, roleLabel } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  return <AppShell><RequireUser>{(u) => <Inner key={u.id} user={u} />}</RequireUser></AppShell>;
}

function Inner({ user }: { user: User }) {
  const [f, setF] = useState({ name: user.name, phone: user.phone, city: user.city, district: user.district });
  const save = useSaveAccount();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [err, setErr] = useState<string | null>(null);
  const valid = f.name.trim().length >= 2 && f.phone.trim().length >= 9 && f.city.trim().length >= 2 && f.district.trim().length >= 2;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const role = user.role === "admin" ? "customer" : user.role; // role is immutable server-side; sent only to satisfy schema
    save.mutate({ data: { name: f.name.trim(), phone: f.phone.trim(), city: f.city.trim(), district: f.district.trim(), role, termsAccepted: true } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetMeQueryKey() }); toast({ title: "تم حفظ بيانات الحساب" }); },
      onError: (e) => setErr(errMsg(e)),
    });
  };

  return (
    <>
      <PageHeader eyebrow="الحساب" title="بياناتك" />
      <form onSubmit={submit} className="max-w-2xl space-y-6 rounded-2xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {([["name", "الاسم"], ["phone", "الجوال"], ["city", "المدينة"], ["district", "الحي"]] as const).map(([k, l]) => (
            <div key={k} className="space-y-1.5"><Label>{l}</Label><Input data-testid={`input-account-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>البريد الإلكتروني</Label><Input value={user.email} disabled dir="ltr" /></div>
          <div className="space-y-1.5"><Label>الدور</Label><div className="flex h-9 items-center gap-2 rounded-md border bg-muted px-3 text-sm"><Lock className="h-3.5 w-3.5 text-muted-foreground" />{roleLabel[user.role]}</div></div>
        </div>
        <p className="text-xs text-muted-foreground">الدور ثابت ولا يمكن تغييره. البريد وكلمة المرور تُدار عبر نظام تسجيل الدخول.</p>
        {err && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
        <Button type="submit" disabled={!valid || save.isPending} data-testid="button-save-account">{save.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}</Button>
      </form>
    </>
  );
}
