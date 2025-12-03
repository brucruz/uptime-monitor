import Hapi from "@hapi/hapi";
import { getQuickStats } from "../lib/clickhouse";

export function registerStatsRoutes(server: Hapi.Server) {
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
}
