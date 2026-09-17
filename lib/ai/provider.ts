import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Single place that decides which LLM provider/model TalentBase talks to.
 * Swap providers by changing LLM_PROVIDER (and the matching API key) in
 * .env — nothing else in the app should import @ai-sdk/* directly.
 *
 * Embeddings are always generated with OpenAI's text-embedding-3-small
 * because Anthropic does not offer an embeddings endpoint. OPENAI_API_KEY is
 * therefore required even when ANTHROPIC is selected for chat completion.
 */

export type Provider = "openai" | "anthropic";

function resolveProvider(): Provider {
  const configured = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (configured === "openai" || configured === "anthropic") {
    return configured;
  }
  // Default to whichever provider has an API key present.
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new Error(
    "No LLM provider configured. Set LLM_PROVIDER and the matching API key in .env."
  );
}

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-5",
};

// Small, cheap model used for the scope-guard classifier — never for
// candidate-data answers. Keeping it separate makes the guard's cost/latency
// independent of the main chat model choice.
const DEFAULT_GUARD_MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
};

export function chatModel(): LanguageModel {
  const provider = resolveProvider();
  const modelName = process.env.LLM_CHAT_MODEL || DEFAULT_MODELS[provider];

  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(modelName);
  }
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic(modelName);
}

export function guardModel(): LanguageModel {
  const provider = resolveProvider();
  const modelName = process.env.LLM_GUARD_MODEL || DEFAULT_GUARD_MODELS[provider];

  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(modelName);
  }
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic(modelName);
}

export const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_MODEL = process.env.LLM_EMBEDDING_MODEL || "text-embedding-3-small";

export function embeddingModel() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required for embeddings (Anthropic has no embeddings API)."
    );
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai.embedding(EMBEDDING_MODEL);
}
