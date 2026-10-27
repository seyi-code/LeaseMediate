import { FastifyInstance } from "fastify";
import net from "net";

async function clamavPing(): Promise<{ ok: boolean; detail: string }> {
  if (process.env.CLAMAV_DISABLED === "true") {
    return { ok: process.env.NODE_ENV !== "production", detail: "disabled" };
  }
  const host = process.env.CLAMAV_HOST ?? "127.0.0.1";
  const port = Number(process.env.CLAMAV_PORT ?? 3310);
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port }, () => {
      s.write("zPING\0");
    });
    let data = "";
    s.setTimeout(3000);
    s.on("data", (c) => {
      data += c.toString();
    });
    s.on("end", () => resolve({ ok: data.includes("PONG"), detail: data.trim() || "empty" }));
    s.on("error", (e) => resolve({ ok: false, detail: e.message }));
    s.on("timeout", () => {
      s.destroy();
      resolve({ ok: false, detail: "timeout" });
    });
  });
}

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    service: "leasemediate-api",
    timestamp: new Date().toISOString(),
  }));

  app.get("/health/ready", async (_req, reply) => {
    const clam = await clamavPing();
    const ready = process.env.NODE_ENV !== "production" || clam.ok;
    return reply.status(ready ? 200 : 503).send({
      ready,
      clamav: clam,
      timestamp: new Date().toISOString(),
    });
  });
}
