import cron from "node-cron";
import { config } from "../config";
import { insertBrowserCheck, insertHttpCheck } from "./clickhouse";
import { runHttpCheck } from "../checks/http-check";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { runBrowserCheck } from "../checks/browser-check";

export function startScheduler() {
  // HTTP checks: every <config.check.httpInterval> minutes
  const httpCronPattern = `*/${config.check.httpInterval} * * * *`;
  console.log(
    `📅 Scheduling HTTP checks: every ${config.check.httpInterval} minute(s)`
  );
  const tracer = trace.getTracer("uptime-monitor-scheduler");
  cron.schedule(httpCronPattern, async () => {
    console.log("🔍 [CRON] Running scheduled HTTP check...");
    await tracer.startActiveSpan("scheduled-http-check", (span) => {
      return (async () => {
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
          const errorInstance =
            error instanceof Error ? error : new Error(String(error));
          span.recordException(errorInstance);
        } finally {
          span.end();
        }
      })();
    });
  });

  // Browser checks: every <config.check.browserInterval> minutes
  const browserCronPattern = `*/${config.check.browserInterval} * * * *`;
  console.log(
    `📅 Scheduling browser checks: every ${config.check.browserInterval} minute(s)`
  );
  cron.schedule(browserCronPattern, async () => {
    console.log("🎭 [CRON] Running scheduled browser check...");
    await tracer.startActiveSpan("scheduled-browser-check", (span) => {
      return (async () => {
        try {
          const result = await runBrowserCheck();
          await insertBrowserCheck(result);
          const status = result.success ? "✅" : "❌";
          span.setStatus({ code: SpanStatusCode.OK });
          console.log(
            `${status} [CRON] Browser check completed: ${
              result.success ? "passed" : "failed"
            } (${result.latency_ms}ms)`
          );
        } catch (error) {
          console.error("❌ [CRON] Error running browser check:", error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          const errorInstance =
            error instanceof Error ? error : new Error(String(error));
          span.recordException(errorInstance);
        } finally {
          span.end();
        }
      })();
    });
  });
  console.log("✅ Scheduler started");
}
