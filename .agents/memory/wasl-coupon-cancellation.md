---
name: WASL coupon cancellation
description: User decision for the WASL Rewards coupon lifecycle.
---

A reward coupon is consumed when an order is placed and remains consumed if that order is later cancelled.

**Why:** The user explicitly chose not to return redeemed coupons after cancellation.

**How to apply:** Keep the coupon's redeemed state when changing an order to cancelled; do not refund its points or make the code available again.
