import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { authenticate } from "../middleware/auth.js";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  name: z.string().optional(),
  organizationName: z.string().min(2),
  organizationSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const body = RegisterSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.status(409).send({ error: "Email already registered" });

    const passwordHash = await hashPassword(body.password);
    const org = await prisma.organization.create({
      data: {
        name: body.organizationName,
        slug: body.organizationSlug,
        users: {
          create: {
            email: body.email,
            name: body.name,
            passwordHash,
            role: "ADMIN",
          },
        },
      },
      include: { users: true },
    });
    const user = org.users[0];
    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: org.id,
    });
    return {
      token,
      user: { id: user.id, email: user.email, role: user.role, organizationId: org.id },
      organization: { id: org.id, name: org.name, slug: org.slug },
    };
  });

  app.post("/auth/login", async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return reply.status(401).send({ error: "Invalid credentials" });

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  });

  app.get("/auth/me", { preHandler: [authenticate] }, async (request) => {
    return { user: request.user };
  });
}
