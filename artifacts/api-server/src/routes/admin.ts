import { Router, type IRouter } from "express";
import { db, users, categories, profiles, services } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as V from "@workspace/api-zod";
import { assert, snapshot, userView } from "../lib/marketplace";
import { requireAccount, requireRole } from "../middlewares/account";

const router: IRouter = Router();
router.use("/admin", requireAccount, requireRole("admin"));
router.get("/admin/users", async (_req, res): Promise<void> => {
  res.json(V.ListAdminUsersResponse.parse((await db.select().from(users)).map(userView)));
});
router.patch("/admin/providers/:id", async (req, res): Promise<void> => {
  const { id } = V.SetProviderStatusParams.parse(req.params), input = V.SetProviderStatusBody.parse(req.body);
  const [u] = await db.update(users).set(input).where(and(eq(users.id, id), eq(users.role, "provider"))).returning();
  assert(u, 404, "مقدم الخدمة غير موجود");
  res.json(V.SetProviderStatusResponse.parse(userView(u)));
});
router.post("/categories", requireAccount, requireRole("admin"), async (req, res): Promise<void> => {
  const { id, ...input } = V.SaveCategoryBody.parse(req.body);
  const [row] = id ? await db.update(categories).set(input).where(eq(categories.id, id)).returning()
    : await db.insert(categories).values(input).returning();
  assert(row, 404, "التصنيف غير موجود");
  res.json(V.SaveCategoryResponse.parse({ ...row, serviceCount: (await snapshot()).published.filter(s => s.categoryId === row.id).length }));
});
router.delete("/categories/:id", requireAccount, requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = V.DeleteCategoryParams.parse(req.params);
  const [p] = await db.select().from(profiles).where(eq(profiles.categoryId, id));
  const [s] = await db.select().from(services).where(eq(services.categoryId, id));
  assert(!p && !s, 409, "لا يمكن حذف تصنيف مرتبط بخدمات أو مقدمي خدمات");
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
  assert(row, 404, "التصنيف غير موجود");
  res.sendStatus(204);
});
export default router;
