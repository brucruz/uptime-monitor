import Hapi from "@hapi/hapi";
import { config } from "./config";
import {
  getHttpChecks,
  getQuickStats,
  insertHttpCheck,
  testConnection,
} from "./lib/clickhouse";
import { runHttpCheck } from "./checks/http-check";
import { SpanStatusCode, trace } from "@opentelemetry/api";

export async function createServer() {
  const server = Hapi.server({
    port: config.server.port,
    host: "localhost",
  });

  server.route({
    method: "GET",
    path: "/health",
    handler: async (_, h) => {
      try {
        const version = await testConnection();

        return {
          status: "ok",
          clickhouse_version: version,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(error);
        return h
          .response({
            status: "error",
            message: "Failed to connect to ClickHouse",
          })
          .code(500);
      }
    },
  });

  server.route({
    method: "POST",
    path: "/checks/run",
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
    path: "/stats",
    handler: async (_, h) => {
      try {
        const stats = await getQuickStats();
        if (stats.length === 0 || !stats[0]) {
          return {
            period: "1 hour",
            total_checks: 0,
            successful: 0,
            failed: 0,
            uptime_percent: 0,
            avg_latency_ms: 0,
            p95_latency_ms: 0,
          };
        }
        return {
          period: "1 hour",
          ...stats[0],
        };
      } catch (error) {
        console.error("Error fetching stats:", error);
        return h.response({ error: "Failed to fetch stats" }).code(500);
      }
    },
  });

  return server;
}
