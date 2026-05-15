import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    _client = new OpenAI({
      apiKey,
      organization: process.env["OPENAI_ORG_ID"],
      maxRetries: 3,
      timeout: 30_000,
    });
  }
  return _client;
}

export const MODELS = {
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
  EMBEDDING_SMALL: "text-embedding-3-small",
  EMBEDDING_LARGE: "text-embedding-3-large",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
