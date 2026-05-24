// LLMProvider abstraction. MockProvider returns deterministic, safety-clean
// output so eval + tests pass offline. OpenAIProvider wraps fetch + bearer auth.
// `safeCall()` glues buildPrompt → provider → postFilter, returning a
// PostFilterResult-like object plus the raw response for auditing.

import { buildPrompt, type BuildPromptInput } from "./prompts";
import { postFilter, type PostFilterResult } from "./postFilter";

export interface LLMProvider {
  readonly name: string;
  complete(input: { system: string; user: string }): Promise<string>;
}

/** Deterministic mock — safety-clean text per prompt id. */
export class MockProvider implements LLMProvider {
  readonly name = "mock";
  async complete(input: { system: string; user: string }): Promise<string> {
    const u = input.user;
    if (u.includes("TASK: Draft a single practice plan")) {
      return JSON.stringify({
        blocks: [
          { name: "Dynamic warm-up", durationMin: 8, drillId: "DYNAMIC_WARMUP_8MIN", notes: "Per Tier 1 warm-up rule" },
          { name: "Throwing progression", durationMin: 20, drillId: "THROW_PROGRESSION", notes: "Hit daily throw budget; stop at form breakdown" },
          { name: "Cool down breath", durationMin: 5, drillId: "MENTAL_RESET_BREATH", notes: "Diaphragmatic 4-7-8" },
        ],
      });
    }
    if (u.includes("TASK: Answer the coach")) {
      return "Per [PITCH_SMART_9_12] (USA Baseball Pitch Smart), daily max for 11-12 is 85 pitches; require 4 days rest after 66+. I recommend staying well under the max during in-season weeks.";
    }
    if (u.includes("TASK: Write a short, encouraging message")) {
      return "Great effort today — your throwing reps were on time and on target. Let's keep stacking those quality swings tomorrow.";
    }
    if (u.includes("TASK: Write a clear, honest update for a parent")) {
      return "Alex completed today's plan: 8 minutes of dynamic warm-up, 20 minutes of position work, and a cool-down. Next session focuses on reaction work.";
    }
    return "I can answer questions about plans, drills, and safety rules.";
  }
}

/** OpenAI Chat Completions provider. Falls back to MockProvider if no key. */
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  constructor(
    private readonly opts: { apiKey: string; model?: string; baseUrl?: string; fetchImpl?: typeof fetch } = {
      apiKey: process.env.OPENAI_API_KEY ?? "",
    }
  ) {}
  async complete(input: { system: string; user: string }): Promise<string> {
    if (!this.opts.apiKey) {
      // Defensive — should be filtered upstream by getDefaultProvider.
      return new MockProvider().complete(input);
    }
    const base = this.opts.baseUrl ?? "https://api.openai.com";
    const f = this.opts.fetchImpl ?? fetch;
    const res = await f(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify({
        model: this.opts.model ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content ?? "";
  }
}

/** Resolve the default provider from env. */
export function getDefaultProvider(): LLMProvider {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
  }
  return new MockProvider();
}

export interface SafeCallResult extends PostFilterResult {
  rawText: string;
  providerName: string;
  promptId: string;
}

/** End-to-end pipeline: buildPrompt → provider → postFilter. */
export async function safeCall(
  provider: LLMProvider,
  input: BuildPromptInput
): Promise<SafeCallResult> {
  const built = buildPrompt(input);
  const raw = await provider.complete(built);
  const filtered = postFilter(raw, { ageBand: input.env.ageBand, userRole: input.env.userRole });
  return { ...filtered, rawText: raw, providerName: provider.name, promptId: input.promptId };
}
