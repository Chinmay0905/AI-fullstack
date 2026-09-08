import session from "express-session";
import MongoStore from "connect-mongo";
import { serverEnv } from "../config/serverEnv";
import { env } from "../config/env";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Frontend (Vercel) and backend (Render) live on different origins, so
 * the session cookie has to be cross-site in production: sameSite "none"
 * + secure (HTTPS, which Render provides) is required for that, but
 * sameSite "none" cookies are rejected outright over plain HTTP — hence
 * the dev/prod split rather than one fixed setting. */
export const sessionMiddleware = session({
  name: "aipk.sid",
  secret: serverEnv.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: serverEnv.MONGODB_URI, ttl: ONE_WEEK_MS / 1000 }),
  cookie: {
    httpOnly: true,
    maxAge: ONE_WEEK_MS,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
  },
});
