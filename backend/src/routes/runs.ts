import { Router } from "express";
import { v4 as uuid } from "uuid";
import { requireAuth } from "../middleware/auth.js";
import { store } from "../store.js";
import { runPipeline } from "../pipeline.js";

export const runRoutes = Router();

runRoutes.use(requireAuth);

runRoutes.post("/run", (req, res) => {
  const { repoUrl, featureDescription } = req.body;
  if (!repoUrl || !featureDescription) {
    res.status(400).json({ error: "repoUrl and featureDescription required" });
    return;
  }
  const run = store.createRun(repoUrl, featureDescription);
  runPipeline(run.id).catch((err) => {
    store.addLog(run.id, {
      agent: "scout",
      event: "error",
      message: `Pipeline failed: ${err.message}`,
    });
    store.updateRun(run.id, { status: "failed" });
  });
  res.status(201).json(run);
});

runRoutes.get("/runs", (_req, res) => {
  res.json(store.listRuns());
});

runRoutes.get("/runs/:id", (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  res.json(run);
});

runRoutes.get("/runs/:id/log", (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  for (const entry of run.log) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  const clientId = uuid();
  store.addSSEClient(req.params.id, { id: clientId, res });

  req.on("close", () => {
    store.removeSSEClient(req.params.id, clientId);
  });
});

runRoutes.post("/runs/:id/approve", (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  if (run.status !== "gate_blocked") {
    res.status(400).json({ error: "run is not gate-blocked" });
    return;
  }
  // The pipeline function is awaiting store.awaitApproval(runId). Resolve
  // it — the pipeline will continue from where it was blocked.
  const resumed = store.resolveApproval(run.id, "approved");
  if (!resumed) {
    // The server probably restarted while the run was blocked; the
    // awaiting promise is gone. We can't recover from in-memory state.
    res.status(409).json({
      error:
        "no pipeline is awaiting approval (server may have restarted since the gate blocked). Start a new run.",
    });
    return;
  }
  res.json({ status: "approved" });
});

runRoutes.post("/runs/:id/reject", (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  const { note } = req.body;
  store.addLog(run.id, {
    agent: run.currentAgent ?? "gatekeeper",
    event: "error",
    message: `Human rejected${note ? `: ${note}` : ""}`,
  });
  const resumed = store.resolveApproval(run.id, "rejected");
  if (!resumed) {
    // Same fallback as approve — if nothing is waiting, just mark failed.
    store.updateRun(run.id, { status: "failed" });
  }
  res.json({ status: "rejected" });
});
