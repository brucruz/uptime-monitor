import Hapi from "@hapi/hapi";
import { getBrowserStats, getHttpStats } from "../lib/clickhouse";

export function registerStatsRoutes(server: Hapi.Server) {
  server.route({
    method: "GET",
    path: "/stats",
    handler: async (_, h) => {
      try {
        const [httpStats, browserStats] = await Promise.all([
          getHttpStats(),
          getBrowserStats(),
        ]);
        const httpData = httpStats[0] ?? {
          total_checks: 0,
          successful: 0,
          failed: 0,
          uptime_percent: 0,
          avg_latency_ms: 0,
          p95_latency_ms: 0,
        };
        const browserData = browserStats[0] ?? {
          total_checks: 0,
          successful: 0,
          failed: 0,
          uptime_percent: 0,
          avg_latency_ms: 0,
          p95_latency_ms: 0,
        };
        return { period: "1 hour", http: httpData, browser: browserData };
      } catch (error) {
        console.error("Error fetching stats:", error);
        return h.response({ error: "Failed to fetch stats" }).code(500);
      }
    },
  });
}
