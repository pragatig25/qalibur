import type { Request, Response, NextFunction } from "express";

// Read env lazily so dotenv has time to load — module-level reads happen
// before the entry point's loadEnv() call due to ES-module import hoisting.
function getAllowedUsers(): string[] {
  return (
    process.env.ALLOWED_USERS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = req.headers["x-github-user"] as string | undefined;
  const allowed = getAllowedUsers();
  if (!user || !allowed.includes(user)) {
    res.status(401).json({
      error: "not authorised",
      hint:
        allowed.length === 0
          ? "ALLOWED_USERS is empty — check the backend .env"
          : `x-github-user "${user ?? "(missing)"}" not in ALLOWED_USERS`,
    });
    return;
  }
  next();
}
