import cron from "node-cron";
import { config } from "../config";
import { insertHttpCheck } from "./clickhouse";
import { runHttpCheck } from "../checks/http-check";

export function startScheduler() {
  // every <config.check.httpInterval> minutes
  const httpCronPattern = `*/${config.check.httpInterval} * * * *`;
  console.log(
    `📅 Scheduling HTTP checks: every ${config.check.httpInterval} minute(s)`
  );
  cron.schedule(httpCronPattern, async () => {
    console.log("🔍 [CRON] Running scheduled HTTP check...");
    try {
      const result = await runHttpCheck(config.target.url, 15000);
      await insertHttpCheck(result);
      const status = result.success ? "✅" : "❌";
      console.log(
        `${status} [CRON] HTTP check completed: ${result.status_code} (${result.latency_ms}ms)`
      );
    } catch (error) {
      console.error("❌ [CRON] Error running HTTP check:", error);
    }
  });
  console.log("✅ Scheduler started");
}
