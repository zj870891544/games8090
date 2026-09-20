/** Keep account URLs, response bodies and secrets out of operator diagnostics. */
export function providerDiagnostic(error: unknown): string {
  if (!(error instanceof Error)) return "Provider request failed.";
  const status = error.message.match(/^Provider returned HTTP (\d{3})$/);
  if (status) return `Provider returned HTTP ${status[1]}`;
  if (error.name === "AbortError" || error.name === "TimeoutError")
    return "Provider request timed out.";
  if (error.name === "ZodError") return "Provider data validation failed.";
  if (
    error.message ===
    "URL origin is not configured. Review provider allowlists."
  )
    return error.message;
  if (error.message.startsWith("Missing configuration:"))
    return "Provider configuration is incomplete.";
  return "Provider request failed.";
}
