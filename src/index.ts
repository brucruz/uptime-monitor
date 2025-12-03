import { initTables } from "./lib/clickhouse.js";
import { startScheduler } from "./lib/scheduler.js";
import { createServer } from "./server.js";

async function start() {
  console.log("🔧 Initializing database...");
  await initTables();

  const server = await createServer();
  await server.start();
  console.log(`🚀 Server running at: ${server.info.uri}`);
  console.log("⏰ Starting scheduler...");
  startScheduler();
}

start().catch(console.error);
