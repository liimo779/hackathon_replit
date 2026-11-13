import { db, pool, users, profiles, services, subscriptions, categories, payments } from "@workspace/db";
import { eq } from "drizzle-orm";

// Explicit one-time development seed. Never executed automatically on publish/startup.
if (process.env.NODE_ENV === "production") throw new Error("Demo data is development-only.");
async function seed() {
  await db.transaction(async tx => {
    const categoryData = [
      { name: "الخدمات المنزلية", icon: "House", subcategories: ["الكهرباء", "السباكة", "التكييف والتبريد", "التنظيف والتعقيم", "النجارة", "تركيب الأثاث"] },
      { name: "الخدمات الشخصية", icon: "Heart", subcategories: ["العناية الشخصية", "التجميل", "الضيافة والمناسبات", "الأسر المنتجة", "الدروس الخصوصية", "المساندة اليومية"] },
      { name: "الخدمات التقنية", icon: "Monitor", subcategories: ["صيانة الأجهزة الذكية والجوالات", "الشبكات والكاميرات", "التصميم الجرافيكي", "التصوير وتحرير الفيديو", "الدعم التقني"] },
    ];
    const categoryIds: number[] = [];
    for (const c of categoryData) {
      const [exists] = await tx.select().from(categories).where(eq(categories.name, c.name));
      const row = exists ?? (await tx.insert(categories).values(c).returning())[0]!;
      categoryIds.push(row.id);
    }
    const examples = [
      { id: "demo-home", name: "أحمد العتيبي", city: "الرياض", district: "الياسمين", bio: "ملف تجريبي لتوضيح تجربة مقدم خدمة متخصص في التكييف والصيانة المنزلية. جميع الخدمات والأسعار هنا لأغراض العرض فقط.", skills: ["صيانة التكييف", "الكهرباء", "تركيب الأجهزة"], experience: 8, categoryId: categoryIds[0]!,
        list: [
          { title: "صيانة وتنظيف المكيفات", description: "خدمة تجريبية تشمل فحص المكيف وتنظيف الفلاتر والوحدة الداخلية والتأكد من كفاءة التبريد.", priceHalalas: 15000, duration: "ساعتان", delivery: "customer_location" as const, images: ["/images/service-home.png"] },
          { title: "تركيب وصيانة التمديدات الكهربائية", description: "خدمة عرض تجريبية لفحص الأعطال الكهربائية واستبدال المفاتيح وتركيب الإضاءة في المنزل.", priceHalalas: 12000, duration: "ساعة إلى ساعتين", delivery: "customer_location" as const, images: ["/images/service-home.png"] },
        ] },
      { id: "demo-personal", name: "نورة القحطاني", city: "الرياض", district: "النرجس", bio: "ملف تجريبي لمقدمة خدمات مناسبات وضيافة. يوضح الملف طريقة عرض المهارات والأعمال السابقة على منصة وصل.", skills: ["تنسيق المناسبات", "الضيافة", "تنسيق الزهور"], experience: 5, categoryId: categoryIds[1]!,
        list: [
          { title: "تنسيق ضيافة مناسبتك", description: "خدمة تجريبية لتنسيق ركن الضيافة وتقديم القهوة العربية بأسلوب يناسب مناسبتك الخاصة.", priceHalalas: 35000, duration: "4 ساعات", delivery: "customer_location" as const, images: ["/images/service-personal.png"] },
          { title: "تنسيق هدايا وتوزيعات المناسبات", description: "خدمة عرض تجريبية لإعداد توزيعات مميزة وتنسيق الهدايا للمناسبات العائلية وحفلات التخرج.", priceHalalas: 20000, duration: "يومان", delivery: "provider_location" as const, images: ["/images/service-personal.png"] },
        ] },
      { id: "demo-tech", name: "خالد الدوسري", city: "جدة", district: "الروضة", bio: "ملف تجريبي لمصمم مستقل متخصص في الهويات البصرية والتصميم الرقمي. جميع المعلومات توضيحية وليست سجلًا مهنيًا حقيقيًا.", skills: ["تصميم جرافيكي", "الهوية البصرية", "الدعم التقني"], experience: 6, categoryId: categoryIds[2]!,
        list: [
          { title: "تصميم هوية بصرية لمشروعك", description: "خدمة تجريبية لتصميم شعار وهوية بصرية متكاملة تتضمن الألوان والخطوط وتطبيقات الهوية.", priceHalalas: 80000, duration: "5 أيام", delivery: "remote" as const, images: ["/images/service-tech.png"] },
          { title: "تصميم منشورات التواصل الاجتماعي", description: "خدمة عرض تجريبية لتصميم مجموعة منشورات تعكس هوية مشروعك وتساعدك على عرض منتجاتك.", priceHalalas: 25000, duration: "3 أيام", delivery: "remote" as const, images: ["/images/service-tech.png"] },
        ] },
    ];
    for (const e of examples) {
      const [existing] = await tx.select().from(users).where(eq(users.id, e.id));
      if (existing) continue;
      await tx.insert(users).values({ id: e.id, name: e.name, email: `${e.id}@example.invalid`, city: e.city, district: e.district, role: "provider", isDemo: true });
      await tx.insert(profiles).values({ userId: e.id, bio: e.bio, categoryId: e.categoryId, skills: e.skills, experience: e.experience, coverage: [e.district, "جميع الأحياء"], portfolio: [], avatar: "" });
      const startsAt = new Date(), endsAt = new Date();
      endsAt.setUTCMonth(endsAt.getUTCMonth() + 1);
      const [sub] = await tx.insert(subscriptions).values({ providerId: e.id, plan: "professional", priceHalalas: 7900, startsAt, endsAt }).returning();
      await tx.insert(payments).values({ userId: e.id, subscriptionId: sub!.id, amountHalalas: 7900 });
      for (const item of e.list) await tx.insert(services).values({ providerId: e.id, categoryId: e.categoryId, ...item });
    }
  });
}
seed().then(() => console.info("Labeled development demonstration catalog ready.")).finally(() => pool.end());
