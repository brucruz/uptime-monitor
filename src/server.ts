import Hapi from "@hapi/hapi";
import { config } from "./config";
import { registerHealthRoutes } from "./routes/health";
import { registerCheckRoutes } from "./routes/checks";
import { registerStatsRoutes } from "./routes/stats";

export async function createServer() {
  const server = Hapi.server({
    port: config.server.port,
    host: "localhost",
  });

  registerHealthRoutes(server);
  registerCheckRoutes(server);
  registerStatsRoutes(server);

  return server;
}
