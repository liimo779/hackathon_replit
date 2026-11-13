import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/common";
import { basePath } from "@/lib/format";

function AuthFrame({ children, title, text }: { children: React.ReactNode; title: string; text: string }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 lg:hidden"><Link href="/"><Logo /></Link></div>
        {children}
      </div>
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col">
        <div className="najdi-pattern absolute inset-0 opacity-25" />
        <Link href="/" className="relative"><Logo light size="lg" /></Link>
        <div className="relative mt-auto">
          <h2 className="font-display text-5xl font-black leading-tight">{title}</h2>
          <p className="mt-4 max-w-md leading-loose text-sidebar-foreground/70">{text}</p>
          <ul className="mt-8 space-y-3 text-sm">
            {["حساب واحد بدور ثابت: عميل أو مقدم خدمة", "أسعار ورسوم واضحة قبل كل طلب", "تقييمات من طلبات مكتملة فقط"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-saffron" />{t}</li>
            ))}
          </ul>
        </div>
        <img src={`${basePath}/images/hero.png`} alt="" className="relative mt-10 h-56 w-full rounded-2xl object-cover opacity-90" />
        <div className="sadu-band absolute inset-x-0 bottom-0" />
      </aside>
    </div>
  );
}

export function SignInPage() {
  return (
    <AuthFrame title="أهلًا بعودتك." text="جيرانك وأصحاب المهارات بانتظارك.">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/dashboard`} />
    </AuthFrame>
  );
}

export function SignUpPage() {
  return (
    <AuthFrame title="انضم إلى وَصل." text="سجّل بالبريد وكلمة المرور، ثم اختر دورك: تطلب خدمة أو تعرض مهارتك.">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/dashboard`} />
    </AuthFrame>
  );
}
