import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { customerPoints, db, pointsTransactions, rewardCoupons } from "@workspace/db";
import * as V from "@workspace/api-zod";
import { account, requireAccount, requireRole } from "../middlewares/account";
import { issueRewardCoupon, REWARD_COST } from "../lib/rewards";

const router: IRouter = Router();
router.use("/rewards", requireAccount, requireRole("customer"));

function couponView(coupon: typeof rewardCoupons.$inferSelect) {
  const status = coupon.redeemedAt || coupon.redeemedOrderId
    ? "used"
    : coupon.expiresAt.getTime() <= Date.now()
      ? "expired"
      : "available";
  return {
    id: coupon.id,
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    createdAt: coupon.createdAt.toISOString(),
    expiresAt: coupon.expiresAt.toISOString(),
    status,
    redeemedOrderId: coupon.redeemedOrderId,
  };
}

router.get("/rewards", async (_req, res): Promise<void> => {
  const user = account(res);
  const [[wallet], coupons, history] = await Promise.all([
    db.select().from(customerPoints).where(eq(customerPoints.customerId, user.id)),
    db.select().from(rewardCoupons).where(eq(rewardCoupons.customerId, user.id)).orderBy(desc(rewardCoupons.id)),
    db.select().from(pointsTransactions).where(eq(pointsTransactions.customerId, user.id)).orderBy(desc(pointsTransactions.id)),
  ]);
  const couponCodes = new Map(coupons.map(coupon => [coupon.id, coupon.code]));
  const balance = wallet?.balance ?? 0;
  res.json(V.GetRewardsResponse.parse({
    balance,
    pointsToNextReward: REWARD_COST - (balance % REWARD_COST),
    coupons: coupons.map(couponView),
    history: history.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      reason: transaction.reason,
      points: transaction.points,
      orderId: transaction.orderId,
      couponCode: transaction.couponId ? couponCodes.get(transaction.couponId) ?? null : null,
      createdAt: transaction.createdAt.toISOString(),
    })),
  }));
});

router.post("/rewards/redeem", async (req, res): Promise<void> => {
  V.RedeemRewardBody.parse(req.body);
  const user = account(res);
  const coupon = await db.transaction(tx => issueRewardCoupon(tx, user.id));
  res.status(201).json(V.RedeemRewardResponse.parse(couponView(coupon)));
});

export default router;
