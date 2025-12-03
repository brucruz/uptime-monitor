import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  clickhouse: z.object({
    host: z.string(),
    port: z.coerce.number().default(8443),
    user: z.string().default("default"),
    password: z.string(),
    database: z.string().default("uptime_monitor"),
  }),
  otel: z.object({
    endpoint: z.string(),
    token: z.string(),
  }),
  target: z.object({
    url: z.string(),
    loginUrl: z.string(),
    email: z.string(),
    password: z.string(),
  }),
  check: z.object({
    httpInterval: z.coerce.number().default(1),
    browserInterval: z.coerce.number().default(5),
  }),
  server: z.object({
    port: z.coerce.number().default(3000),
    env: z.enum(["development", "production"]).default("development"),
  }),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST,
    port: process.env.CLICKHOUSE_PORT,
    user: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DATABASE,
  },
  otel: {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    token: process.env.GRAFANA_CLOUD_TOKEN,
  },
  target: {
    url: process.env.TARGET_URL,
    loginUrl: process.env.TARGET_LOGIN_URL,
    email: process.env.TARGET_EMAIL,
    password: process.env.TARGET_PASSWORD,
  },
  check: {
    httpInterval: process.env.HTTP_CHECK_INTERVAL,
    browserInterval: process.env.BROWSER_CHECK_INTERVAL,
  },
  server: {
    port: process.env.PORT,
    env: process.env.NODE_ENV,
  },
});
