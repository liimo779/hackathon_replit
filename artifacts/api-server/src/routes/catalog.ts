import { Router, type IRouter } from "express";
import { db, users, profiles, categories, services, uploads } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import * as V from "@workspace/api-zod";
import { snapshot, assert, currentSubscription } from "../lib/marketplace";
import { requireAccount, requireRole, account } from "../middlewares/account";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();
router.get("/categories", async (_req, res): Promise<void> => {
  res.json(V.ListCategoriesResponse.parse((await snapshot()).categoryViews));
});
router.get("/services", async (req, res): Promise<void> => {
  const q = V.ListServicesQueryParams.parse({ ...req.query, mine: req.query.mine === "true" });
  const s = await snapshot();
  let rows = s.published;
  if (q.mine) {
    // Explicit protected branch; never trust a provider id from query for ownership.
    const id = getAuth(req).userId;
    assert(id, 401, "يرجى تسجيل الدخول");
    const u = s.userMap.get(id);
    assert(u?.role === "provider" && u.active, 403, "خاص بمقدمي الخدمات");
    rows = s.allServices.filter(s => s.providerId === id && !s.archived);
  }
  let result = rows.map(s.serviceView);
  if (q.search) result = result.filter(s => `${s.title} ${s.description} ${s.providerName}`.includes(q.search!.trim()));
  if (q.categoryId) result = result.filter(s => s.categoryId === q.categoryId);
  if (q.city) result = result.filter(s => s.city.includes(q.city!));
  if (q.district) result = result.filter(s => s.district.includes(q.district!));
  if (q.providerId) result = result.filter(s => s.providerId === q.providerId);
  result.sort((a, b) => q.sort === "price" ? a.price - b.price : q.sort === "newest" ? b.id - a.id : Number(b.professional) - Number(a.professional) || b.rating - a.rating);
  res.json(V.ListServicesResponse.parse(result));
});
router.get("/services/:id", async (req, res): Promise<void> => {
  const { id } = V.GetServiceParams.parse(req.params);
  const s = await snapshot();
  const row = s.published.find(r => r.id === id);
  assert(row, 404, "الخدمة غير متاحة حاليًا");
  res.json(V.GetServiceResponse.parse(s.serviceView(row)));
});
router.get("/providers", async (_req, res): Promise<void> => {
  const s = await snapshot();
  const list = s.allProfiles.filter(p => s.userMap.get(p.userId)?.active && s.activeSub(p.userId)).map(p => s.providerView(p.userId));
  list.sort((a, b) => Number(b.professional) - Number(a.professional) || b.rating - a.rating);
  res.json(V.ListProvidersResponse.parse(list));
});
router.get("/providers/:id", async (req, res): Promise<void> => {
  const { id } = V.GetProviderParams.parse(req.params);
  const s = await snapshot();
  const u = s.userMap.get(id);
  const viewer = s.userMap.get(getAuth(req).userId ?? "");
  const admin = viewer?.active && viewer.role === "admin";
  assert(u?.role === "provider" && (admin || (u.active && s.activeSub(id))), 404, "مقدم الخدمة غير متاح حاليًا");
  if (!admin && viewer?.id !== id) await db.update(profiles).set({ views: sql`${profiles.views} + 1` }).where(eq(profiles.userId, id));
  const provider = s.providerView(id);
  if (!admin && viewer?.id !== id) provider.views++;
  res.json(V.GetProviderResponse.parse({ provider, services: (admin ? s.allServices.filter(r => !r.archived) : s.published).filter(r => r.providerId === id).map(s.serviceView), reviews: s.allReviews.filter(r => r.providerId === id).map(s.reviewView) }));
});
router.get("/marketplace/stats", async (_req, res): Promise<void> => {
  const s = await snapshot();
  res.json(V.GetMarketplaceStatsResponse.parse({ providers: s.allProfiles.filter(p => s.activeSub(p.userId) && s.userMap.get(p.userId)?.active).length,
    services: s.published.length, completedOrders: s.allOrders.filter(o => o.status === "completed").length, reviews: s.allReviews.length,
    demo: s.published.some(p => s.userMap.get(p.providerId)?.isDemo) }));
});
router.use("/provider", requireAccount, requireRole("provider"));
router.get("/provider/profile", async (_req, res): Promise<void> => {
  const s = await snapshot();
  res.json(V.GetMyProviderProfileResponse.parse(s.providerView(account(res).id)));
});
async function checkImages(id: string, images: string[]) {
  const owned = await db.select().from(uploads).where(eq(uploads.userId, id));
  const allowed = new Set(owned.map(u => "/api/storage" + u.objectPath));
  assert(images.every(image => image === "" || allowed.has(image)), 400, "يرجى رفع الصور من حسابك باستخدام أداة رفع الصور");
}
router.put("/provider/profile", async (req, res): Promise<void> => {
  const u = account(res);
  const input = V.SaveProviderProfileBody.parse(req.body);
  const sub = await currentSubscription(u.id);
  assert(input.portfolio.length <= (sub?.plan === "professional" ? 20 : 5), 400, "تجاوزت عدد صور معرض الأعمال المسموح في خطتك");
  await checkImages(u.id, [input.avatar, ...input.portfolio]);
  const [cat] = await db.select().from(categories).where(eq(categories.id, input.categoryId));
  assert(cat, 400, "التصنيف غير موجود");
  await db.update(profiles).set(input).where(eq(profiles.userId, u.id));
  res.json(V.SaveProviderProfileResponse.parse((await snapshot()).providerView(u.id)));
});
router.post("/services", requireAccount, requireRole("provider"), async (req, res): Promise<void> => {
  const u = account(res), input = V.CreateServiceBody.parse(req.body);
  await checkImages(u.id, input.images);
  const row = await db.transaction(async tx => {
    await tx.select().from(users).where(eq(users.id, u.id)).for("update");
    const sub = await currentSubscription(u.id);
    assert(sub, 403, "يجب تفعيل اشتراكك قبل نشر الخدمات");
    const current = await tx.select().from(services).where(and(eq(services.providerId, u.id), eq(services.archived, false)));
    assert(current.length < (sub.plan === "professional" ? 15 : 5), 400, "وصلت إلى الحد الأقصى للخدمات في خطتك");
    const { price, ...rest } = input;
    const [created] = await tx.insert(services).values({ ...rest, providerId: u.id, priceHalalas: Math.round(price * 100) }).returning();
    return created!;
  });
  res.status(201).json(V.CreateServiceResponse.parse((await snapshot()).serviceView(row)));
});
router.patch("/services/:id", requireAccount, requireRole("provider"), async (req, res): Promise<void> => {
  const u = account(res), { id } = V.UpdateServiceParams.parse(req.params), input = V.UpdateServiceBody.parse(req.body);
  assert(await currentSubscription(u.id), 403, "جدد اشتراكك قبل تحديث الخدمات المنشورة");
  await checkImages(u.id, input.images);
  const { price, ...rest } = input;
  const [row] = await db.update(services).set({ ...rest, priceHalalas: Math.round(price * 100) }).where(and(eq(services.id, id), eq(services.providerId, u.id), eq(services.archived, false))).returning();
  assert(row, 404, "الخدمة غير موجودة");
  res.json(V.UpdateServiceResponse.parse((await snapshot()).serviceView(row)));
});
router.delete("/services/:id", requireAccount, requireRole("provider"), async (req, res): Promise<void> => {
  const { id } = V.DeleteServiceParams.parse(req.params);
  const [row] = await db.update(services).set({ archived: true }).where(and(eq(services.id, id), eq(services.providerId, account(res).id), eq(services.archived, false))).returning();
  assert(row, 404, "الخدمة غير موجودة");
  res.sendStatus(204);
});
export default router;
