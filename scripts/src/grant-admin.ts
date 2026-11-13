import { createClerkClient } from "@clerk/backend";
import { db, pool, users, bootstrapGrants } from "@workspace/db";
import { eq } from "drizzle-orm";

// Owner-operated one-time role grant; no first-signup or publicly accessible bootstrap.
// Run in the intended environment after the owner has signed up and completed onboarding.
async function grant() {
  const email = process.argv[process.argv.indexOf("--email") + 1];
  if (!process.argv.includes("--email") || !email || !email.includes("@")) throw new Error("Usage: pnpm --filter @workspace/scripts admin:grant --email owner@example.com");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const result = await clerk.users.getUserList({ emailAddress: [email], limit: 2 });
  if (result.data.length !== 1) throw new Error("The specified account must already exist in this environment.");
  const identity = result.data[0]!;
  const verified = identity.emailAddresses.some(e => e.emailAddress.toLowerCase() === email.toLowerCase() && e.verification?.status === "verified");
  if (!verified) throw new Error("Ownership must be verified before granting administration.");
  await db.transaction(async tx => {
    const [u] = await tx.select().from(users).where(eq(users.id, identity.id)).for("update");
    if (!u || u.isDemo) throw new Error("Complete onboarding with a real account first.");
    const [grant] = await tx.select().from(bootstrapGrants).where(eq(bootstrapGrants.email, email.toLowerCase()));
    if (grant) { console.info("Initial grant already applied; no permissions were changed."); return; }
    await tx.update(users).set({ role: "admin" }).where(eq(users.id, identity.id));
    await tx.insert(bootstrapGrants).values({ email: email.toLowerCase(), userId: identity.id });
    console.info("Administrator access granted to the verified account.");
  });
}
grant().finally(() => pool.end());
