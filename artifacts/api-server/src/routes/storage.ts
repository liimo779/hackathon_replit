import { Router, type IRouter } from "express";
import { db, uploads } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { requireAccount, requireRole, account } from "../middlewares/account";
import { assert } from "../lib/marketplace";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();
router.post("/storage/uploads/request-url", requireAccount, requireRole("provider"), async (req, res): Promise<void> => {
  const input = RequestUploadUrlBody.parse(req.body);
  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  await db.insert(uploads).values({ userId: account(res).id, objectPath, contentType: input.contentType, size: input.size });
  res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath }));
});
router.get("/storage/objects/{*path}", async (req, res): Promise<void> => {
  const objectPath = req.path.replace("/storage", "");
  const [record] = await db.select().from(uploads).where(eq(uploads.objectPath, objectPath));
  assert(record, 404, "الصورة غير موجودة");
  const file = await storage.getObjectEntityFile(objectPath);
  // Profile/service images are public by product design; constrain rendering to safe raster types.
  const [metadata] = await file.getMetadata();
  assert(["image/jpeg", "image/png", "image/webp"].includes(metadata.contentType ?? ""), 400, "نوع الصورة غير مدعوم");
  assert(Number(metadata.size ?? 0) <= 10485760, 400, "الصورة تتجاوز الحجم المسموح");
  res.set("Content-Type", metadata.contentType);
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "public, max-age=3600");
  file.createReadStream().on("error", () => res.destroy()).pipe(res);
});
export default router;
