import { Router, type IRouter } from "express";
import { db, users, subscriptions, services, payments, customerPoints } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as V from "@workspace/api-zod";
import { plans, assert, snapshot, subscriptionView } from "../lib/marketplace";
import { requireAccount, requireRole, account } from "../middlewares/account";

const router: IRouter = Router();
router.get("/plans", (_req, res): void => { res.json(V.ListPlansResponse.parse(plans)); });
router.get("/subscriptions", requireAccount, requireRole("provider", "admin"), async (_req, res): Promise<void> => {
  const u = account(res), s = await snapshot();
  res.json(V.ListSubscriptionsResponse.parse(s.allSubscriptions.filter(s => u.role === "admin" || s.providerId === u.id).map(subscriptionView)));
});
router.post("/subscriptions", requireAccount, requireRole("provider"), async (req, res): Promise<void> => {
  const u = account(res), input = V.SubscribePlanBody.parse(req.body);
  assert(input.simulatePayment === true, 400, "الدفع التجريبي فقط متاح، لن يتم خصم أي مبلغ حقيقي");
  const plan = plans.find(p => p.id === input.plan)!;
  const row = await db.transaction(async tx => {
    await tx.select().from(users).where(eq(users.id, u.id)).for("update");
    const activeServices = await tx.select().from(services).where(and(eq(services.providerId, u.id), eq(services.archived, false)));
    assert(activeServices.length <= plan.serviceLimit, 400, `احذف الخدمات الزائدة قبل الانتقال إلى خطة تسمح بـ${plan.serviceLimit} خدمات`);
    await tx.update(subscriptions).set({ status: "replaced" }).where(and(eq(subscriptions.providerId, u.id), eq(subscriptions.status, "active")));
    const startsAt = new Date(), endsAt = new Date(startsAt);
    // A calendar month, clamping to the last valid day in the following month.
    const day = endsAt.getUTCDate();
    endsAt.setUTCDate(1);
    endsAt.setUTCMonth(endsAt.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(endsAt.getUTCFullYear(), endsAt.getUTCMonth() + 1, 0)).getUTCDate();
    endsAt.setUTCDate(Math.min(day, lastDay));
    const [created] = await tx.insert(subscriptions).values({ providerId: u.id, plan: input.plan, priceHalalas: plan.price * 100, startsAt, endsAt }).returning();
    await tx.insert(payments).values({ userId: u.id, subscriptionId: created!.id, amountHalalas: plan.price * 100 });
    return created!;
  });
  res.status(201).json(V.SubscribePlanResponse.parse(subscriptionView(row)));
});
router.get("/dashboard", requireAccount, async (_req, res): Promise<void> => {
  const u = account(res), s = await snapshot();
  const [wallet] = u.role === "customer"
    ? await db.select().from(customerPoints).where(eq(customerPoints.customerId, u.id))
    : [];
  const os = s.allOrders.filter(o => u.role === "admin" || (u.role === "provider" ? o.providerId === u.id : o.customerId === u.id));
  const completed = os.filter(o => o.status === "completed");
  const myServices = u.role === "admin" ? s.published : s.allServices.filter(r => r.providerId === u.id && !r.archived);
  res.json(V.GetDashboardResponse.parse({
    role: u.role, serviceCount: myServices.length, newOrders: os.filter(o => o.status === "new").length,
    inProgressOrders: os.filter(o => ["accepted", "in_progress"].includes(o.status)).length,
    completedOrders: completed.length, views: s.allProfiles.find(p => p.userId === u.id)?.views ?? 0,
    rating: s.ratings(u.id).rating, totalOrders: os.length,
    totalValue: completed.reduce((sum, o) => sum + o.totalHalalas, 0) / 100,
    commissionTotal: completed.reduce((sum, o) => sum + o.commissionHalalas, 0) / 100,
    customers: u.role === "admin" ? s.allUsers.filter(u => u.role === "customer").length : 0,
    providers: u.role === "admin" ? s.allUsers.filter(u => u.role === "provider").length : 0,
    activeSubscriptions: u.role === "admin" ? s.allUsers.filter(u => s.activeSub(u.id)).length : 0,
    categoryDistribution: u.role === "admin" ? s.allCategories.map(c => ({ name: c.name, count: s.allProfiles.filter(p => p.categoryId === c.id).length })) : [],
    recentOrders: os.slice(0, 6).map(s.orderView), subscription: s.activeSub(u.id) ? subscriptionView(s.activeSub(u.id)!) : null,
    pointsBalance: wallet?.balance ?? 0,
  }));
});
export default router;
