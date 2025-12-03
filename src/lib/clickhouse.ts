import { createClient } from "@clickhouse/client";
import { config } from "../config";
import { HttpCheckResult } from "../checks/http-check";

export const clickhouse = createClient({
  url: `https://${config.clickhouse.host}:${config.clickhouse.port}`,
  username: config.clickhouse.user,
  password: config.clickhouse.password,
  database: config.clickhouse.database,
});

export async function testConnection() {
  const result = await clickhouse.query({
    query: "SELECT version()",
    format: "JSON",
  });
  return result.json();
}

export async function initTables() {
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS http_checks (
        id UUID DEFAULT generateUUIDv4(),
        url String,
        status_code UInt16,
        latency_ms UInt32,
        success UInt8,
        error_message Nullable(String),
        checked_at DateTime64(3),
        trace_id String
      ) ENGINE = MergeTree()
      ORDER BY (url, checked_at)
      TTL checked_at + INTERVAL 30 DAY;
    `,
  });
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS browser_checks (
        id UUID DEFAULT generateUUIDv4(),
        url String,
        check_type String,
        success UInt8,
        latency_ms UInt32,
        error_message Nullable(String),
        screenshot_url Nullable(String),
        checked_at DateTime64(3),
        trace_id String
      ) ENGINE = MergeTree()
      ORDER BY (url, checked_at)
      TTL checked_at + INTERVAL 30 DAY
    `,
  });

  console.log("✅ Tables created/verified");
}

export async function insertHttpCheck(result: HttpCheckResult) {
  await clickhouse.insert({
    table: "http_checks",
    values: [
      {
        ...result,
        success: result.success ? 1 : 0,
        checked_at: result.checked_at.toISOString(),
      },
    ],
    format: "JSONEachRow",
  });
}

export interface HttpCheck {
  url: string;
  status_code: number;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  checked_at: string;
  trace_id: string;
}
export async function getHttpChecks(): Promise<HttpCheck[]> {
  const result = await clickhouse.query({
    query: `
      SELECT 
        url,
        status_code,
        latency_ms,
        success,
        error_message,
        checked_at,
        trace_id
      FROM http_checks
      ORDER BY checked_at DESC
      LIMIT 20
    `,
    format: "JSONEachRow",
  });
  return result.json();
}

export interface QuickStats {
  total_checks: number;
  successful: number;
  failed: number;
  uptime_percent: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
}
export async function getQuickStats(): Promise<QuickStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT 
        count() as total_checks,
        countIf(success = 1) as successful,
        countIf(success = 0) as failed,
        round(countIf(success = 1) / count() * 100, 2) as uptime_percent,
        round(avg(latency_ms), 0) as avg_latency_ms,
        round(quantile(0.95)(latency_ms), 0) as p95_latency_ms
      FROM http_checks
      WHERE
        checked_at > now() - INTERVAL 1 HOUR AND
        success = 1
    `,
    format: "JSONEachRow",
  });
  return result.json();
}
