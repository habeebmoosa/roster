/** The shape `GET /api/models/[provider]` returns — enough for a model picker to show context/price, not the full catalog record. */
export interface ModelOption {
  modelId: string;
  label: string;
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  inputPricePerMTok?: number | null;
  outputPricePerMTok?: number | null;
  reasoningSupport?: boolean;
  toolCallSupport?: boolean;
}
