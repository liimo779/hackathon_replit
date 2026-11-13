import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common";

export default function NotFound() {
  return (
    <div className="najdi-pattern flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
      <Logo size="lg" />
      <div className="mt-10 font-display text-8xl font-black text-primary/20">٤٠٤</div>
      <h1 className="mt-2 text-2xl font-extrabold">ضللنا الطريق قليلًا</h1>
      <p className="mt-2 text-muted-foreground">الصفحة التي تبحث عنها غير موجودة.</p>
      <Button asChild className="mt-6"><Link href="/" data-testid="link-home-404">العودة للرئيسية</Link></Button>
    </div>
  );
}
