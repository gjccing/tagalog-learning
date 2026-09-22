export type WebMcpInputSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type WebMcpToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: WebMcpInputSchema;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    consequentialHint?: boolean;
  };
  execute: (
    input: Record<string, unknown>,
    options?: { signal: AbortSignal },
  ) => unknown;
};

type ModelContext = {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
};

export function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;

  const ctx = (
    document as Document & { modelContext?: ModelContext }
  ).modelContext;

  if (!ctx || typeof ctx.registerTool !== "function") {
    return null;
  }

  return ctx;
}

export async function registerWebMcpTools(
  tools: WebMcpToolDefinition[],
  signal: AbortSignal,
) {
  const ctx = getModelContext();
  if (!ctx) return;

  for (const tool of tools) {
    if (signal.aborted) return;

    try {
      await ctx.registerTool(tool, { signal });
    } catch {
      return;
    }
  }
}
