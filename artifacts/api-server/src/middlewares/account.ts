import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, users, type WaslUser } from "@workspace/db";
import { eq } from "drizzle-orm";
import { assert } from "../lib/marketplace";

export function account(res: Response): WaslUser { return res.locals.user as WaslUser; }
export async function requireAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = getAuth(req).userId;
  assert(id, 401, "يرجى تسجيل الدخول للمتابعة");
  const [user] = await db.select().from(users).where(eq(users.id, id));
  assert(user, 403, "يرجى استكمال بيانات حسابك أولًا");
  assert(user.active, 403, "حسابك موقوف، يرجى التواصل مع إدارة المنصة");
  res.locals.user = user;
  next();
}
export const requireRole = (...roles: string[]) => (_req: Request, res: Response, next: NextFunction) => {
  assert(roles.includes(account(res).role), 403, "ليس لديك صلاحية الوصول إلى هذه الصفحة");
  next();
};
export function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin) {
      const forwarded = req.get("x-forwarded-host")?.split(",")[0]?.trim();
      assert(new URL(origin).host === (forwarded || req.get("host")), 403, "طلب غير مسموح");
    }
  }
  next();
}
