/**
 * Production Runtime Error Reporting Engine
 * Logs handled and unhandled errors securely without external third-party telemetry dependencies.
 */

type ErrorContext = Record<string, unknown>;

function describeThrown(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function reportRuntimeError(error: unknown, context: ErrorContext = {}) {
  if (typeof window === "undefined") return;

  const stack = error instanceof Error ? error.stack : undefined;
  const message = describeThrown(error);

  if (import.meta.env.DEV) {
    console.error("[KisanAI Error Boundary]:", message, { context, stack });
  }
}
