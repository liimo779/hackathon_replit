import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useGetMe, type User } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./common";

export function useSession() {
  const q = useGetMe();
  return { ...q, user: q.data?.user ?? null, authenticated: !!q.data?.authenticated };
}

export function FullSkeleton() {
  return (
    <div className="space-y-6 p-2">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

/** Requires a signed-in user with a completed profile and, optionally, a role. */
export function RequireUser({ roles, children }: { roles?: Array<User["role"]>; children: (user: User) => ReactNode }) {
  const { isLoading, error, refetch, user, authenticated } = useSession();
  if (isLoading) return <FullSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!authenticated) return <Redirect to="/sign-in" />;
  if (!user) return <Redirect to="/onboarding" />;
  if (roles && !roles.includes(user.role)) return <Redirect to="/dashboard" />;
  return <>{children(user)}</>;
}
