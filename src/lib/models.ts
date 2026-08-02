export type ModelProvider = "OpenAI" | "Google";

export type ChatModel = {
  id: string;
  label: string;
  provider: ModelProvider;
  description: string;
  /** USD per 1M input tokens */
  inputCost: number;
  /** USD per 1M output tokens */
  outputCost: number;
  vision: boolean;
  files: boolean;
};

export const CHAT_MODELS: ChatModel[] = [
  {
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "OpenAI",
    description: "Flagship reasoning, coding and agentic work",
    inputCost: 1.25,
    outputCost: 10,
    vision: true,
    files: true,
  },
  {
    id: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "OpenAI",
    description: "Balanced everyday quality at lower cost",
    inputCost: 0.6,
    outputCost: 4,
    vision: true,
    files: true,
  },
  {
    id: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "OpenAI",
    description: "Fast and cheap for simple, high-volume tasks",
    inputCost: 0.15,
    outputCost: 1.2,
    vision: true,
    files: true,
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    provider: "OpenAI",
    description: "Affordable frontier model for analysis and code",
    inputCost: 1.1,
    outputCost: 8,
    vision: true,
    files: true,
  },
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    provider: "OpenAI",
    description: "Strong mini model for high-volume workloads",
    inputCost: 0.25,
    outputCost: 2,
    vision: true,
    files: true,
  },
  {
    id: "google/gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    provider: "Google",
    description: "Fast multimodal reasoning with long context",
    inputCost: 0.3,
    outputCost: 2.5,
    vision: true,
    files: true,
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    provider: "Google",
    description: "Deepest Gemini reasoning for hard problems",
    inputCost: 1.25,
    outputCost: 10,
    vision: true,
    files: true,
  },
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    provider: "Google",
    description: "Cheapest option for classification and summaries",
    inputCost: 0.1,
    outputCost: 0.4,
    vision: true,
    files: true,
  },
];

export const DEFAULT_MODEL = "openai/gpt-5.6-sol";

export function getModel(id: string): ChatModel {
  return CHAT_MODELS.find((m) => m.id === id) ?? CHAT_MODELS[0]!;
}

export function isSupportedModel(id: unknown): id is string {
  return typeof id === "string" && CHAT_MODELS.some((m) => m.id === id);
}

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number) {
  const model = getModel(modelId);
  return (inputTokens / 1_000_000) * model.inputCost + (outputTokens / 1_000_000) * model.outputCost;
}

export function formatCost(usd: number) {
  if (usd <= 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
