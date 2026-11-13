import { Router, type IRouter } from "express";
import { db, users, services, orders, reviews, commissions, payments } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as V from "@workspace/api-zod";
import { assert, snapshot, currentSubscription } from "../lib/marketplace";
import { requireAccount, requireRole, account } from "../middlewares/account";

const router: IRouter = Router();
router.use("/orders", requireAccount);
router.get("/orders", async (_req, res): Promise<void> => {
  const u = account(res), s = await snapshot();
  const list = s.allOrders.filter(o => u.role === "admin" || (u.role === "provider" ? o.providerId === u.id : o.customerId === u.id));
  res.json(V.ListOrdersResponse.parse(list.map(s.orderView)));
});
router.post("/orders", requireRole("customer"), async (req, res): Promise<void> => {
  const input = V.CreateOrderBody.parse(req.body), u = account(res);
  if (input.scheduledAt) {
    assert(Number.isFinite(Date.parse(input.scheduledAt)) && Date.parse(input.scheduledAt) > Date.now(), 400, "يرجى اختيار موعد مستقبلي صحيح");
  }
  const created = await db.transaction(async tx => {
    const [service] = await tx.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.archived, false)));
    assert(service, 404, "الخدمة غير متاحة");
    const [provider] = await tx.select().from(users).where(eq(users.id, service.providerId)).for("update");
    assert(provider?.active, 400, "مقدم الخدمة غير متاح");
    assert(await currentSubscription(service.providerId), 400, "اشتراك مقدم الخدمة منتهٍ، لا يمكن استقبال طلبات جديدة");
    assert(service.delivery === "remote" || input.location.trim().length >= 3, 400, "يرجى إدخال موقع تقديم الخدمة");
    const commission = Math.round(service.priceHalalas / 10);
    const [row] = await tx.insert(orders).values({ serviceId: service.id, serviceTitle: service.title, customerId: u.id,
      providerId: service.providerId, description: input.description, scheduledAt: input.scheduledAt ?? "", location: input.location,
      priceHalalas: service.priceHalalas, commissionHalalas: commission, totalHalalas: service.priceHalalas + commission }).returning();
    await tx.insert(commissions).values({ orderId: row!.id, amountHalalas: commission });
    await tx.insert(payments).values({ userId: u.id, orderId: row!.id, amountHalalas: row!.totalHalalas });
    return row!;
  });
  res.status(201).json(V.CreateOrderResponse.parse((await snapshot()).orderView(created)));
});
router.get("/orders/:id", async (req, res): Promise<void> => {
  const { id } = V.GetOrderParams.parse(req.params), u = account(res), s = await snapshot();
  const row = s.allOrders.find(o => o.id === id);
  assert(row && (u.role === "admin" || row.customerId === u.id || row.providerId === u.id), 404, "الطلب غير موجود");
  res.json(V.GetOrderResponse.parse(s.orderView(row)));
});
router.patch("/orders/:id", async (req, res): Promise<void> => {
  const { id } = V.UpdateOrderStatusParams.parse(req.params), { status } = V.UpdateOrderStatusBody.parse(req.body), u = account(res);
  const updated = await db.transaction(async tx => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    assert(o && (o.providerId === u.id || o.customerId === u.id), 404, "الطلب غير موجود");
    if (u.role === "customer") {
      assert(status === "cancelled" && ["new", "accepted"].includes(o.status), 400, "يمكن إلغاء الطلبات الجديدة أو المقبولة فقط");
    } else {
      assert(u.role === "provider" && o.providerId === u.id, 403, "غير مصرح");
      const allowed: Record<string, string[]> = { new: ["accepted", "cancelled"], accepted: ["in_progress", "cancelled"], in_progress: ["completed"], completed: [], cancelled: [] };
      assert(allowed[o.status]?.includes(status), 400, "لا يمكن تغيير حالة الطلب بهذا التسلسل");
    }
    const [row] = await tx.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    if (status === "completed" || status === "cancelled") {
      await tx.update(commissions).set({ status: status === "completed" ? "earned" : "cancelled" }).where(eq(commissions.orderId, id));
      if (status === "cancelled") await tx.update(payments).set({ status: "simulated_refunded" }).where(eq(payments.orderId, id));
    }
    return row!;
  });
  res.json(V.UpdateOrderStatusResponse.parse((await snapshot()).orderView(updated)));
});
router.post("/orders/:id/review", requireRole("customer"), async (req, res): Promise<void> => {
  const { id } = V.CreateReviewParams.parse(req.params), input = V.CreateReviewBody.parse(req.body), u = account(res);
  const row = await db.transaction(async tx => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    assert(o?.customerId === u.id && o.status === "completed", 400, "يمكن تقييم طلباتك المكتملة فقط");
    const [exists] = await tx.select().from(reviews).where(eq(reviews.orderId, id));
    assert(!exists, 409, "تم تقييم هذا الطلب مسبقًا");
    const [r] = await tx.insert(reviews).values({ orderId: id, customerId: u.id, providerId: o.providerId, ...input }).returning();
    return r!;
  });
  res.status(201).json(V.CreateReviewResponse.parse((await snapshot()).reviewView(row)));
});
export default router;
