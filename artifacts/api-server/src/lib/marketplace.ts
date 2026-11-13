import { db, users, profiles, categories, services, subscriptions, orders, reviews, pointsTransactions, type WaslUser } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export const plans = [
  { id: "basic" as const, name: "الأساسية", price: 39, serviceLimit: 5, features: ["ملف شخصي احترافي", "نشر حتى 5 خدمات", "استقبال الطلبات والتقييمات", "الظهور في نتائج البحث", "لوحة تحكم لإدارة الخدمات والطلبات"] },
  { id: "professional" as const, name: "الاحترافية", price: 79, serviceLimit: 15, features: ["جميع مميزات الخطة الأساسية", "نشر حتى 15 خدمة", "معرض أعمال موسع حتى 20 صورة", "إحصائيات زيارات الملف والطلبات", "عرض سجل العملاء وطلباتهم", "ظهور مميز في نتائج البحث", "شارة مقدم خدمة احترافي"] },
];
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assert(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
export const userView = (u: WaslUser) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, city: u.city, district: u.district,
  role: u.role, active: u.active, isDemo: u.isDemo,
});
export function subscriptionView(s: typeof subscriptions.$inferSelect) {
  return { id: s.id, providerId: s.providerId, plan: s.plan, price: s.priceHalalas / 100,
    status: s.status === "active" && s.endsAt.getTime() <= Date.now() ? "expired" : s.status,
    startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString(), simulated: s.simulated };
}
export async function snapshot() {
  const [allUsers, allProfiles, allCategories, allServices, allSubscriptions, allOrders, allReviews, allPointsTransactions] = await Promise.all([
    db.select().from(users), db.select().from(profiles), db.select().from(categories),
    db.select().from(services).orderBy(desc(services.id)),
    db.select().from(subscriptions).orderBy(desc(subscriptions.id)),
    db.select().from(orders).orderBy(desc(orders.id)), db.select().from(reviews).orderBy(desc(reviews.id)),
    db.select().from(pointsTransactions),
  ]);
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const pointsByOrder = new Map<number, number>();
  for (const transaction of allPointsTransactions) {
    if (transaction.orderId !== null) {
      pointsByOrder.set(transaction.orderId, (pointsByOrder.get(transaction.orderId) ?? 0) + transaction.points);
    }
  }
  const activeSub = (id: string) => allSubscriptions.find(s => s.providerId === id && s.status === "active" && s.endsAt.getTime() > Date.now());
  const ratings = (id: string) => {
    const list = allReviews.filter(r => r.providerId === id);
    return { rating: list.length ? Math.round(list.reduce((a, r) => a + r.rating, 0) / list.length * 10) / 10 : 0, reviewCount: list.length };
  };
  const providerView = (id: string) => {
    const u = userMap.get(id)!;
    const p = allProfiles.find(p => p.userId === id);
    assert(u && p, 404, "مقدم الخدمة غير موجود");
    return { id, name: u.name, city: u.city, district: u.district, bio: p.bio, categoryId: p.categoryId,
      skills: p.skills, experience: p.experience, coverage: p.coverage, avatar: p.avatar, portfolio: p.portfolio,
      views: p.views, ...ratings(id), professional: activeSub(id)?.plan === "professional", isDemo: u.isDemo, active: u.active };
  };
  const serviceView = (s: typeof services.$inferSelect) => {
    const u = userMap.get(s.providerId)!;
    return { id: s.id, providerId: s.providerId, providerName: u.name, title: s.title, description: s.description,
      categoryId: s.categoryId, price: s.priceHalalas / 100, duration: s.duration, delivery: s.delivery, images: s.images,
      city: u.city, district: u.district, ...ratings(s.providerId), professional: activeSub(s.providerId)?.plan === "professional", isDemo: u.isDemo };
  };
  const orderView = (o: typeof orders.$inferSelect) => ({
    id: o.id, serviceId: o.serviceId, serviceTitle: o.serviceTitle, customerId: o.customerId,
    customerName: userMap.get(o.customerId)?.name ?? "", providerId: o.providerId, providerName: userMap.get(o.providerId)?.name ?? "",
    description: o.description, scheduledAt: o.scheduledAt, location: o.location,
    originalPrice: (o.originalPriceHalalas ?? o.priceHalalas) / 100,
    discount: o.discountHalalas / 100,
    couponCode: o.couponCode,
    price: o.priceHalalas / 100, commission: o.commissionHalalas / 100, total: o.totalHalalas / 100,
    status: o.status, createdAt: o.createdAt.toISOString(), reviewed: allReviews.some(r => r.orderId === o.id),
    pointsEarned: pointsByOrder.get(o.id) ?? 0,
    isDemo: Boolean(userMap.get(o.providerId)?.isDemo || userMap.get(o.customerId)?.isDemo),
  });
  const reviewView = (r: typeof reviews.$inferSelect) => ({
    id: r.id, orderId: r.orderId, customerName: userMap.get(r.customerId)?.name ?? "",
    rating: r.rating, comment: r.comment, createdAt: r.createdAt.toISOString(),
  });
  const published = allServices.filter(s => !s.archived && userMap.get(s.providerId)?.active && activeSub(s.providerId));
  const categoryViews = allCategories.map(c => ({ ...c, serviceCount: published.filter(s => s.categoryId === c.id).length }));
  return { allUsers, allProfiles, allCategories, allServices, allSubscriptions, allOrders, allReviews, userMap, activeSub, ratings, providerView, serviceView, orderView, reviewView, published, categoryViews };
}
export async function currentSubscription(id: string) {
  const list = await db.select().from(subscriptions).where(eq(subscriptions.providerId, id)).orderBy(desc(subscriptions.id));
  return list.find(s => s.status === "active" && s.endsAt.getTime() > Date.now());
}
