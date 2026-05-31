import { Octokit } from "octokit";
import { store } from "../store.js";

interface RunnerResult {
  actionsRunUrl: string | null;
  status: string;
}

export async function runnerAgent(runId: string): Promise<RunnerResult> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    store.addLog(runId, {
      agent: "runner",
      event: "progress",
      message: "No GITHUB_TOKEN — skipping workflow trigger",
    });
    return { actionsRunUrl: null, status: "skipped" };
  }

  const repoMatch = run.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!repoMatch) {
    return { actionsRunUrl: null, status: "invalid_repo_url" };
  }

  const [, owner, repo] = repoMatch;
  const octokit = new Octokit({ auth: token });
  const repoClean = repo.replace(".git", "");

  try {
    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo: repoClean,
      workflow_id: "qalibur.yml",
      ref: `qalibur/run-${runId.slice(0, 8)}`,
      inputs: { run_id: runId },
    });

    await new Promise((r) => setTimeout(r, 3000));

    const { data: runs } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo: repoClean,
      workflow_id: "qalibur.yml",
      per_page: 1,
    });

    const latestRun = runs.workflow_runs[0];
    const actionsRunUrl = latestRun?.html_url ?? null;

    return { actionsRunUrl, status: "triggered" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    store.addLog(runId, {
      agent: "runner",
      event: "error",
      message: `Actions trigger error: ${message}`,
    });
    return { actionsRunUrl: null, status: "error" };
  }
}
