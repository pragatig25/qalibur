import { callLLM } from "../llm.js";
import { store } from "../store.js";

const SYSTEM = `You are Crafter, a QE agent that generates TypeScript Playwright test scripts.
Given Gherkin feature files, produce working Playwright test code.
Use modern Playwright patterns: page object model where appropriate, proper assertions, test.describe blocks.
Output complete, runnable .spec.ts file content.`;

export async function crafterAgent(
  runId: string,
  gherkinContent: string,
  feedback: string | null = null
): Promise<string> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const userMessage = `Generate TypeScript Playwright test scripts from these Gherkin features:

Repository: ${run.repoUrl}
Feature: ${run.featureDescription}

Gherkin content:
${gherkinContent}

Generate complete Playwright .spec.ts file content with:
- import { test, expect } from '@playwright/test'
- test.describe blocks matching Feature sections
- Individual test() blocks matching Scenarios
- Proper page interactions (click, fill, goto, waitFor)
- Strong assertions using expect()
- Comments linking back to Gherkin scenarios
- Data-driven tests for Scenario Outlines${
    feedback
      ? `

REVISION NOTES — your previous attempt did not pass the quality gate. Address the feedback below, then produce the complete revised spec file:
${feedback}`
      : ""
  }`;

  return callLLM(SYSTEM, userMessage, { maxTokens: 8192 });
}
