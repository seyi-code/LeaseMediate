/**
 * OpenTelemetry bootstrap. Enable with OTEL_ENABLED=true.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

let sdk: NodeSDK | null = null;

export function startOtel(serviceName = "leasemediate-api") {
  if (process.env.OTEL_ENABLED !== "true") {
    console.log("[otel] disabled (set OTEL_ENABLED=true to enable)");
    return;
  }
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces";
  sdk = new NodeSDK({
    resource: new Resource({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
  console.log(`[otel] started → ${endpoint}`);
  process.on("SIGTERM", () => {
    sdk?.shutdown().catch(console.error);
  });
}
