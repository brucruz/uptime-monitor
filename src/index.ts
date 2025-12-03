import { closeBrowser } from "./checks/browser-check.js";
import { initTables } from "./lib/clickhouse.js";
import { startScheduler } from "./lib/scheduler.js";
import { initTracing } from "./lib/tracing.js";
import { createServer } from "./server.js";

async function start() {
  console.log("🔭 Initializing tracing...");
  initTracing();
  console.log("🔧 Initializing database...");
  await initTables();

  const server = await createServer();
  await server.start();
  console.log(`🚀 Server running at: ${server.info.uri}`);
  console.log("⏰ Starting scheduler...");
  startScheduler();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    await closeBrowser();
    await server.stop();
    process.exit(0);
  });
}

start().catch(console.error);
