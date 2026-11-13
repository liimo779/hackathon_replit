import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, users, profiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetMeResponse, SaveAccountBody, SaveAccountResponse } from "@workspace/api-zod";
import { assert, userView } from "../lib/marketplace";

const router: IRouter = Router();
router.get("/me", async (req, res): Promise<void> => {
  const id = getAuth(req).userId;
  const [user] = id ? await db.select().from(users).where(eq(users.id, id)) : [];
  res.json(GetMeResponse.parse({ authenticated: Boolean(id), user: user ? userView(user) : null }));
});
router.post("/me", async (req, res): Promise<void> => {
  const id = getAuth(req).userId;
  assert(id, 401, "يرجى تسجيل الدخول");
  const input = SaveAccountBody.parse(req.body);
  assert(input.termsAccepted, 400, "يجب الموافقة على الشروط والأحكام");
  assert(/^\+?[0-9\s-]{9,20}$/.test(input.phone), 400, "رقم الجوال غير صحيح");
  const identity = await clerkClient.users.getUser(id);
  const email = identity.emailAddresses.find(e => e.id === identity.primaryEmailAddressId);
  assert(email && email.verification?.status === "verified", 400, "يرجى تأكيد بريدك الإلكتروني");
  const result = await db.transaction(async tx => {
    const [existing] = await tx.select().from(users).where(eq(users.id, id));
    if (existing) {
      assert(existing.active, 403, "الحساب موقوف");
      assert(existing.role === input.role || existing.role === "admin", 400, "لا يمكن تغيير نوع الحساب");
      const [updated] = await tx.update(users).set({ name: input.name.trim(), phone: input.phone, city: input.city.trim(), district: input.district.trim(), email: email.emailAddress }).where(eq(users.id, id)).returning();
      return updated!;
    }
    if (input.role === "provider") assert(input.categoryId, 400, "اختر مجال الخدمة");
    const [created] = await tx.insert(users).values({ id, name: input.name.trim(), email: email.emailAddress, phone: input.phone, city: input.city.trim(), district: input.district.trim(), role: input.role }).returning();
    if (input.role === "provider") await tx.insert(profiles).values({ userId: id, categoryId: input.categoryId! });
    return created!;
  });
  res.json(SaveAccountResponse.parse(userView(result)));
});
export default router;
