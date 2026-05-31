import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<string> {
  const model =
    options?.model ?? process.env.MODEL ?? "claude-sonnet-4-6";
  const response = await getClient().messages.create({
    model,
    max_tokens: options?.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error(`Unexpected response type: ${block.type}`);
  }
  return block.text;
}

export async function callLLMJson<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<T> {
  const raw = await callLLM(
    systemPrompt + "\n\nRespond with valid JSON only. No markdown fences, no explanation.",
    userMessage,
    options
  );
  const cleaned = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned) as T;
}
