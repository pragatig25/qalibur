import "dotenv/config";
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
