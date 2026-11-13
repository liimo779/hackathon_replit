import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { customerPoints, db, pointsTransactions, rewardCoupons } from "@workspace/db";
import { assert } from "./marketplace";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const POINTS_FOR_COMPLETION = 10;
export const POINTS_FOR_REVIEW = 5;
export const REWARD_COST = 100;
export const REWARD_DISCOUNT_PERCENT = 10;

export async function awardPoints(
  tx: Transaction,
  customerId: string,
  orderId: number,
  reason: "order_completed" | "review_submitted",
  points: number,
): Promise<boolean> {
  await tx.insert(customerPoints).values({ customerId }).onConflictDoNothing();
  const [ledgerEntry] = await tx.insert(pointsTransactions).values({
    customerId,
    orderId,
    reason,
    type: "earned",
    points,
  }).onConflictDoNothing().returning({ id: pointsTransactions.id });

  if (!ledgerEntry) return false;

  await tx.update(customerPoints)
    .set({ balance: sql`${customerPoints.balance} + ${points}`, updatedAt: new Date() })
    .where(sql`${customerPoints.customerId} = ${customerId}`);
  return true;
}

export function newRewardCode(): string {
  return `WASL-${randomBytes(12).toString("hex").toUpperCase()}`;
}

export function calculateOrderAmounts(originalPriceHalalas: number, discountPercent = 0) {
  const discountHalalas = Math.round(originalPriceHalalas * discountPercent / 100);
  const priceHalalas = originalPriceHalalas - discountHalalas;
  const commissionHalalas = Math.round(priceHalalas / 10);
  return {
    originalPriceHalalas,
    discountHalalas,
    priceHalalas,
    commissionHalalas,
    totalHalalas: priceHalalas + commissionHalalas,
  };
}

export async function lockRewardCoupon(tx: Transaction, customerId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  const [coupon] = await tx.select().from(rewardCoupons).where(eq(rewardCoupons.code, code)).for("update");
  assert(coupon && coupon.customerId === customerId, 400, "رمز الخصم غير صالح");
  assert(!coupon.redeemedOrderId && !coupon.redeemedAt, 409, "تم استخدام هذا الرمز من قبل");
  assert(coupon.expiresAt.getTime() > Date.now(), 400, "انتهت صلاحية رمز الخصم");
  return coupon;
}

export async function consumeRewardCoupon(tx: Transaction, couponId: number, orderId: number): Promise<void> {
  const [updated] = await tx.update(rewardCoupons)
    .set({ redeemedOrderId: orderId, redeemedAt: new Date() })
    .where(and(eq(rewardCoupons.id, couponId), isNull(rewardCoupons.redeemedOrderId), isNull(rewardCoupons.redeemedAt)))
    .returning({ id: rewardCoupons.id });
  assert(updated, 409, "تم استخدام هذا الرمز من قبل");
}

export async function issueRewardCoupon(tx: Transaction, customerId: string) {
  await tx.insert(customerPoints).values({ customerId }).onConflictDoNothing();
  const [wallet] = await tx.select().from(customerPoints).where(sql`${customerPoints.customerId} = ${customerId}`).for("update");
  assert(wallet, 500, "تعذر تحميل رصيد النقاط");
  assert(wallet.balance >= REWARD_COST, 400, `تحتاج إلى ${REWARD_COST} نقطة لاستبدال المكافأة`);

  const now = new Date();
  const [coupon] = await tx.insert(rewardCoupons).values({
    customerId,
    code: newRewardCode(),
    discountPercent: REWARD_DISCOUNT_PERCENT,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  }).returning();
  await tx.insert(pointsTransactions).values({
    customerId,
    type: "redeemed",
    reason: "reward_redeemed",
    points: -REWARD_COST,
    couponId: coupon!.id,
  });
  await tx.update(customerPoints)
    .set({ balance: sql`${customerPoints.balance} - ${REWARD_COST}`, updatedAt: now })
    .where(sql`${customerPoints.customerId} = ${customerId}`);
  return coupon!;
}
