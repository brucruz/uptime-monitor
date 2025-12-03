import Hapi from "@hapi/hapi";
import { testConnection } from "../lib/clickhouse";

export function registerHealthRoutes(server: Hapi.Server) {
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
}

