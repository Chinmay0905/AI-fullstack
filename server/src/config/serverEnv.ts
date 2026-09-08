/** Vars required only by the full Express app (src/index.ts), not by the
 * batch entry point. See env.ts for why this is split out. */
import { z } from "zod";
import { parseOrExit } from "./env";

const ServerEnvSchema = z.object({
  PORT: z.coerce.number().int().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  CLIENT_ORIGINS: z.string().default("http://localhost:3000"),
});

const parsed = parseOrExit(ServerEnvSchema, "server");

export const serverEnv = {
  ...parsed,
  clientOrigins: parsed.CLIENT_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
};
