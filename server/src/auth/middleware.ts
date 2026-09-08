import type { Request, Response, NextFunction } from "express";

/** Section 1: "a signed-out visitor cannot reach protected pages or
 * endpoints" + "sensible handling of expired or invalid sessions" — an
 * expired/invalid session just looks like no session to express-session,
 * so this single check covers both cases with one clear 401. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
    return;
  }
  next();
}
