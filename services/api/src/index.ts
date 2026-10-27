import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import { caseRoutes } from "./routes/cases.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { documentRoutes } from "./routes/documents.js";

dotenv.config();

const app = Fastify({
  logger: true,
  bodyLimit: 20 * 1024 * 1024,
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") ?? true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret-change-me-in-production",
});

await app.register(multipart, {
  limits: { fileSize: 15 * 1024 * 1024 },
});

await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  timeWindow: "1 minute",
});

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
});

await app.register(healthRoutes);
await app.register(authRoutes, { prefix: "/api/v1" });
await app.register(caseRoutes, { prefix: "/api/v1" });
await app.register(documentRoutes, { prefix: "/api/v1" });

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`LeaseMediate API listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
