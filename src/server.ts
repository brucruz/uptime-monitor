import Hapi from "@hapi/hapi";
import { config } from "./config";
import {
  getHttpChecks,
  getQuickStats,
  insertHttpCheck,
  testConnection,
} from "./lib/clickhouse";
import { runHttpCheck } from "./checks/http-check";

export async function createServer() {
  const server = Hapi.server({
    port: config.server.port,
    host: "localhost",
  });

  server.route({
    method: "GET",
    path: "/health",
    handler: async () => {
      try {
        const version = await testConnection();

        return {
          status: "ok",
          clickhouse_version: version,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(error);
        return { status: "error", message: "Failed to connect to ClickHouse" };
      }
    },
  });

  server.route({
    method: "POST",
    path: "/checks/run",
    handler: async (_, h) => {
      try {
        console.log("🔍 Running HTTP check...");
        const result = await runHttpCheck(config.target.url, 15000);
        console.log("💾 Storing in ClickHouse...");
        await insertHttpCheck(result);
        return { message: "Check completed and stored", result };
      } catch (error) {
        console.error(error);
        return h.response({ message: "Error running check" }).code(500);
      }
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
