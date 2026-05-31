import { callLLMJson } from "../llm.js";
import { store } from "../store.js";

interface ArchReview {
  verdict: "pass" | "needs_work" | "fail";
  patterns: { name: string; status: "good" | "missing" | "incorrect"; note: string }[];
  suggestions: string[];
}

const SYSTEM = `You are Architect, a QE agent that reviews Playwright test scripts for structure, patterns, and best practices.
Evaluate the test code against modern Playwright conventions:
- Page Object Model usage
- Proper locator strategies (getByRole, getByText over CSS selectors)
- Test isolation (no shared state between tests)
- Proper setup/teardown
- Meaningful assertions
- Error handling patterns`;

export async function architectAgent(runId: string, playwrightCode: string): Promise<ArchReview> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const userMessage = `Review this Playwright test code for structure and patterns:

${playwrightCode}

Return JSON:
{
  "verdict": "pass" | "needs_work" | "fail",
  "patterns": [
    { "name": "<pattern name>", "status": "good" | "missing" | "incorrect", "note": "<detail>" }
  ],
  "suggestions": ["<improvement suggestion>"]
}`;

  return callLLMJson<ArchReview>(SYSTEM, userMessage);
}
