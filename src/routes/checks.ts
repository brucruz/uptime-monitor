import Hapi from "@hapi/hapi";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { config } from "../config";
import {
  getBrowserChecks,
  getHttpChecks,
  insertBrowserCheck,
  insertHttpCheck,
} from "../lib/clickhouse";
import { runHttpCheck } from "../checks/http-check";
import { runBrowserCheck } from "../checks/browser-check";

export function registerCheckRoutes(server: Hapi.Server) {
  server.route({
    method: "POST",
    path: "/checks/http/run",
    handler: async (_, h) => {
      const tracer = trace.getTracer("uptime-monitor-check");
      return await tracer.startActiveSpan("manual-http-check", async (span) => {
        try {
          console.log("🔍 Running HTTP check...");
          const result = await runHttpCheck(config.target.url, 15000);
          console.log("💾 Storing in ClickHouse...");
          await insertHttpCheck(result);
          span.setStatus({ code: SpanStatusCode.OK });
          return { message: "Check completed and stored", result };
        } catch (error) {
          console.error(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          span.recordException(error as Error);
          return h.response({ message: "Error running check" }).code(500);
        } finally {
          span.end();
        }
      });
    },
  });

  server.route({
    method: "POST",
    path: "/checks/browser/run",
    handler: async (_, h) => {
      const tracer = trace.getTracer("uptime-monitor-check");
      return await tracer.startActiveSpan(
        "manual-browser-check",
        async (span) => {
          try {
            console.log("🎭 Running browser check...");
            const result = await runBrowserCheck();
            console.log("💾 Storing in ClickHouse...");
            await insertBrowserCheck(result);
            const status = result.success ? "✅" : "❌";
            console.log(
              `${status} Browser check: ${
                result.success ? "passed" : "failed"
              } (${result.latency_ms}ms)`
            );
            return {
              message: "Browser check completed and stored",
              result,
            };
          } catch (error) {
            console.error("Error running browser check:", error);
            return h
              .response({
                error: error instanceof Error ? error.message : "Unknown error",
              })
              .code(500);
          } finally {
            span.end();
          }
        }
      );
    },
  });

  server.route({
    method: "GET",
    path: "/checks/http",
    handler: async (_, h) => {
      try {
        const checks = await getHttpChecks();
        return { checks };
      } catch (error) {
        console.error("Error fetching checks:", error);
        return h
          .response({
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .code(500);
      }
    },
  });

  server.route({
    method: "GET",
    path: "/checks/browser",
    handler: async (_, h) => {
      try {
        const checks = await getBrowserChecks();
        return { checks };
      } catch (error) {
        console.error("Error fetching checks:", error);
        return h
          .response({
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .code(500);
      }
    },
  });
}
