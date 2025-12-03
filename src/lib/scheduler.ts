import cron from "node-cron";
import { config } from "../config";
import { insertHttpCheck } from "./clickhouse";
import { runHttpCheck } from "../checks/http-check";
import { SpanStatusCode, trace } from "@opentelemetry/api";

export function startScheduler() {
  // every <config.check.httpInterval> minutes
  const httpCronPattern = `*/${config.check.httpInterval} * * * *`;
  console.log(
    `📅 Scheduling HTTP checks: every ${config.check.httpInterval} minute(s)`
  );
  const tracer = trace.getTracer("uptime-monitor-scheduler");
  cron.schedule(httpCronPattern, async () => {
    console.log("🔍 [CRON] Running scheduled HTTP check...");
    await tracer.startActiveSpan("scheduled-http-check", async (span) => {
      try {
        const result = await runHttpCheck(config.target.url, 15000);
        await insertHttpCheck(result);
        const status = result.success ? "✅" : "❌";
        console.log(
          `${status} [CRON] HTTP check completed: ${result.status_code} (${result.latency_ms}ms)`
        );
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        console.error("❌ [CRON] Error running HTTP check:", error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        span.recordException(error as Error);
      } finally {
        span.end();
      }
    });
  });
  console.log("✅ Scheduler started");
}
