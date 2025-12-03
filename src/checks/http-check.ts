import { trace } from "@opentelemetry/api";

export interface HttpCheckResult {
  url: string;
  status_code: number;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  checked_at: Date;
  trace_id: string;
  retries?: number;
}

interface HttpCheckOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}
async function fetchWithRetry(
  url: string,
  options: HttpCheckOptions
): Promise<{ response: Response; latency_ms: number }> {
  const { timeout = 10000, maxRetries = 2, retryDelay = 1000 } = options;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(timeout),
      });
      const latency_ms = Date.now() - startTime;
      return { response, latency_ms };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      const isTimeout =
        lastError.name === "TimeoutError" ||
        lastError.message.includes("timeout");
      const isNetworkError =
        lastError.name === "TypeError" ||
        lastError.message.includes("fetch failed");
      // Only retry on timeout or network errors, not on other errors
      if ((isTimeout || isNetworkError) && attempt < maxRetries) {
        console.log(
          `⚠️ [HTTP] Retry ${attempt + 1}/${maxRetries} after ${
            lastError.message
          }`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export async function runHttpCheck(
  url: string,
  timeout: number = 10000
): Promise<HttpCheckResult> {
  const checked_at = new Date();
  const span = trace.getActiveSpan();
  const trace_id = span?.spanContext().traceId ?? "";

  try {
    const { response, latency_ms } = await fetchWithRetry(url, { timeout });
    return {
      url,
      status_code: response.status,
      latency_ms,
      success: response.ok,
      error_message: null,
      checked_at,
      trace_id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ [HTTP] Check failed: ${errorMessage}`);
    return {
      url,
      status_code: 0,
      latency_ms: 0,
      success: false,
      error_message: errorMessage,
      checked_at,
      trace_id,
    };
  }
}
