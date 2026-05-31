import { v4 as uuid } from "uuid";

export type AgentName =
  | "scout"
  | "strategist"
  | "scribe"
  | "crafter"
  | "gatekeeper"
  | "architect"
  | "runner"
  | "herald"
  | "triage"
  | "deployer";

export interface LogEntry {
  timestamp: string;
  agent: AgentName;
  event: "start" | "progress" | "complete" | "error" | "gate_pass" | "gate_fail" | "retry";
  message: string;
  data?: unknown;
}

export interface Artifact {
  id: string;
  runId: string;
  agent: AgentName;
  type: string;
  filename: string;
  content: string;
  createdAt: string;
}

export interface GateReview {
  id: string;
  runId: string;
  artifactId: string;
  agent: AgentName;
  score: number;
  criteria: Record<string, { score: number; reasoning: string }>;
  passed: boolean;
  attempt: number;
  createdAt: string;
}

export interface Defect {
  id: string;
  runId: string;
  testName: string;
  classification: "flaky" | "regression" | "environment" | "genuine";
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  suggestedFix: string;
  screenshotPath?: string;
  createdAt: string;
}

export type RunStatus =
  | "pending"
  | "running"
  | "gate_blocked"
  | "completed"
  | "failed";

export interface Run {
  id: string;
  repoUrl: string;
  featureDescription: string;
  status: RunStatus;
  currentAgent: AgentName | null;
  log: LogEntry[];
  artifacts: Artifact[];
  gateReviews: GateReview[];
  defects: Defect[];
  prUrl: string | null;
  actionsRunUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type SSEClient = {
  id: string;
  res: import("express").Response;
};

class RunStore {
  private runs = new Map<string, Run>();
  private sseClients = new Map<string, SSEClient[]>();

  createRun(repoUrl: string, featureDescription: string): Run {
    const run: Run = {
      id: uuid(),
      repoUrl,
      featureDescription,
      status: "pending",
      currentAgent: null,
      log: [],
      artifacts: [],
      gateReviews: [],
      defects: [],
      prUrl: null,
      actionsRunUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.runs.set(run.id, run);
    return run;
  }

  getRun(id: string): Run | undefined {
    return this.runs.get(id);
  }

  listRuns(): Run[] {
    return Array.from(this.runs.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  updateRun(id: string, updates: Partial<Run>): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;
    Object.assign(run, updates, { updatedAt: new Date().toISOString() });
    return run;
  }

  addLog(runId: string, entry: Omit<LogEntry, "timestamp">): void {
    const run = this.runs.get(runId);
    if (!run) return;
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    run.log.push(logEntry);
    run.updatedAt = new Date().toISOString();
    this.broadcast(runId, logEntry);
  }

  addArtifact(runId: string, artifact: Omit<Artifact, "id" | "runId" | "createdAt">): Artifact {
    const run = this.runs.get(runId);
    const a: Artifact = {
      ...artifact,
      id: uuid(),
      runId,
      createdAt: new Date().toISOString(),
    };
    if (run) {
      run.artifacts.push(a);
      run.updatedAt = new Date().toISOString();
    }
    return a;
  }

  addGateReview(runId: string, review: Omit<GateReview, "id" | "runId" | "createdAt">): GateReview {
    const run = this.runs.get(runId);
    const g: GateReview = {
      ...review,
      id: uuid(),
      runId,
      createdAt: new Date().toISOString(),
    };
    if (run) {
      run.gateReviews.push(g);
      run.updatedAt = new Date().toISOString();
    }
    return g;
  }

  addDefect(runId: string, defect: Omit<Defect, "id" | "runId" | "createdAt">): Defect {
    const run = this.runs.get(runId);
    const d: Defect = {
      ...defect,
      id: uuid(),
      runId,
      createdAt: new Date().toISOString(),
    };
    if (run) {
      run.defects.push(d);
      run.updatedAt = new Date().toISOString();
    }
    return d;
  }

  addSSEClient(runId: string, client: SSEClient): void {
    const clients = this.sseClients.get(runId) ?? [];
    clients.push(client);
    this.sseClients.set(runId, clients);
  }

  removeSSEClient(runId: string, clientId: string): void {
    const clients = this.sseClients.get(runId) ?? [];
    this.sseClients.set(
      runId,
      clients.filter((c) => c.id !== clientId)
    );
  }

  private broadcast(runId: string, data: unknown): void {
    const clients = this.sseClients.get(runId) ?? [];
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      client.res.write(payload);
    }
  }
}

export const store = new RunStore();
