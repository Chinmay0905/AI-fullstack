import express from "express";
import cors from "cors";
import { serverEnv } from "./config/serverEnv";
import { sessionMiddleware } from "./auth/session";
import authRoutes from "./routes/auth";
import kitsRoutes from "./routes/kits";

export function createApp() {
  const app = express();

  // Behind Render's proxy in production — needed for secure cookies to work.
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: serverEnv.clientOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(sessionMiddleware);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/kits", kitsRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: { code: "UNKNOWN_ERROR", message: "Something went wrong." } });
  });

  return app;
}
