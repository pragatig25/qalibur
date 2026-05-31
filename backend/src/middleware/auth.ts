import type { Request, Response, NextFunction } from "express";

const allowed =
  process.env.ALLOWED_USERS?.split(",").map((s) => s.trim()) ?? [];

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = req.headers["x-github-user"] as string | undefined;
  if (!user || !allowed.includes(user)) {
    res.status(401).json({ error: "not authorised" });
    return;
  }
  next();
}
