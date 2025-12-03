import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { config } from "../config";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

let sdk: NodeSDK | null = null;

export function initTracing() {
  if (sdk) {
    console.log("⚠️  Tracing already initialized");
    return;
  }
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "uptime-monitor",
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${config.otel.endpoint}/v1/traces`,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.otel.instanceId}:${config.otel.token}`
        ).toString("base64")}`,
      },
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });
  console.log(`📡 OTLP endpoint: ${config.otel.endpoint}/v1/traces`);
  sdk.start();
  console.log("✅ OpenTelemetry tracing initialized");
  // Gracefully shutdown tracing on exit
  process.on("SIGTERM", () => {
    sdk
      ?.shutdown()
      .then(() => console.log("Tracing terminated"))
      .catch((error) => console.error("Error terminating tracing", error))
      .finally(() => process.exit(0));
  });
}
