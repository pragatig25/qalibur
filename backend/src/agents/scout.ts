import { callLLMJson } from "../llm.js";
import { store } from "../store.js";

interface CoverageGap {
  area: string;
  description: string;
  risk: "low" | "medium" | "high" | "critical";
  suggestedTestTypes: string[];
}

interface ScoutResult {
  repoUrl: string;
  structure: string[];
  existingTests: string[];
  coverageGaps: CoverageGap[];
  recommendations: string[];
}

const SYSTEM = `You are Scout, a QE agent that analyzes repository structure and identifies coverage gaps.
Given a repository URL and feature description, produce a structured analysis.
Identify areas lacking test coverage, rank them by risk, and suggest test types.`;

export async function scoutAgent(runId: string): Promise<ScoutResult> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const userMessage = `Analyze this repository for test coverage gaps:

Repository: ${run.repoUrl}
Feature description: ${run.featureDescription}

Return a JSON object with:
- repoUrl: the repo URL
- structure: array of key file paths / directories
- existingTests: array of existing test file paths (or empty if unknown)
- coverageGaps: array of { area, description, risk ("low"|"medium"|"high"|"critical"), suggestedTestTypes }
- recommendations: array of high-level recommendations`;

  return callLLMJson<ScoutResult>(SYSTEM, userMessage);
}
