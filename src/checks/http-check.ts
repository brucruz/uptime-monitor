export interface HttpCheckResult {
  url: string;
  status_code: number;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  checked_at: Date;
  trace_id: string;
}

export async function runHttpCheck(
  url: string,
  timeout: number = 10000
): Promise<HttpCheckResult> {
  const startTime = Date.now();
  const checked_at = new Date();
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeout),
    });
    const latency_ms = Date.now() - startTime;
    return {
      url,
      status_code: response.status,
      latency_ms,
      success: response.ok,
      error_message: null,
      checked_at,
      trace_id: "",
    };
  } catch (error) {
    const latency_ms = Date.now() - startTime;
    return {
      url,
      status_code: 0,
      latency_ms,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
      checked_at,
      trace_id: "",
    };
  }
}
