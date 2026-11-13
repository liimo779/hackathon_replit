import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { sameOrigin } from "./middlewares/account";
import { HttpError } from "./lib/marketplace";
import type { Request, Response, NextFunction } from "express";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(
    getClerkProxyHost(req) ?? "",
    process.env.CLERK_PUBLISHABLE_KEY,
  ),
})));
app.use(sameOrigin);

app.use("/api", router);
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  if (err?.name === "ZodError") { res.status(400).json({ error: "يرجى التأكد من تعبئة الحقول بصورة صحيحة", details: err.issues }); return; }
  const code = err?.code ?? err?.cause?.code;
  if (code === "23503") { res.status(400).json({ error: "البيانات مرتبطة بسجل غير موجود أو مستخدم" }); return; }
  if (code === "23505") { res.status(409).json({ error: "السجل موجود مسبقًا، يرجى تحديث الصفحة" }); return; }
  req.log.error({ err }, "Request failed");
  res.status(500).json({ error: "تعذر إتمام العملية، يرجى المحاولة مجددًا" });
});

export default app;
