import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useListOrders, getListOrdersQueryKey, type OrderStatus } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout";
import { RequireUser } from "@/components/session";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { OrderRow } from "./dashboard";
import { statusLabel, num } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  return <AppShell><RequireUser>{() => <Inner />}</RequireUser></AppShell>;
}

function Inner() {
  const q = useListOrders({
    query: {
      queryKey: getListOrdersQueryKey(),
      refetchInterval: (query) => (query.state.dataUpdateCount < 20 ? 20000 : false),
    },
  });
  const [tab, setTab] = useState<OrderStatus | "all">("all");
  const list = (q.data ?? []).filter((o) => tab === "all" || o.status === tab);
  const tabs: Array<OrderStatus | "all"> = ["all", "new", "accepted", "in_progress", "completed", "cancelled"];
  return (
    <>
      <PageHeader eyebrow="الطلبات" title="طلباتك" subtitle="تتحدث الحالة تلقائيًا كل عشرين ثانية لفترة محدودة." />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const c = t === "all" ? q.data?.length ?? 0 : (q.data ?? []).filter((o) => o.status === t).length;
          return (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors", tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40")}>
              {t === "all" ? "الكل" : statusLabel[t]} <span className="num opacity-70">{num(c)}</span>
            </button>
          );
        })}
      </div>
      {q.isLoading ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
        : list.length === 0 ? <EmptyState icon={ClipboardList} title="لا توجد طلبات هنا" />
        : <div className="divide-y overflow-hidden rounded-2xl border bg-card">{list.map((o) => <OrderRow key={o.id} o={o} />)}</div>}
    </>
  );
}
