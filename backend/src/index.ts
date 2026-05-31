import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Look for .env in either the cwd (project root) or one level up
// (when run from backend/ via `npm run dev:backend`). First match wins.
for (const candidate of [".env", "../.env"]) {
  const abs = resolve(candidate);
  if (existsSync(abs)) {
    loadEnv({ path: abs });
    break;
  }
}

import express from "express";
import cors from "cors";
import { runRoutes } from "./routes/runs.js";
import { healthRoute } from "./routes/health.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api", healthRoute);
app.use("/api", runRoutes);

app.listen(PORT, () => {
  console.log(`Qalibur backend listening on :${PORT}`);
});
