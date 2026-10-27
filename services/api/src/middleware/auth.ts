import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/prisma.js";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  organizationId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const payload = await request.jwtVerify<{
      sub: string;
      email: string;
      role: string;
      organizationId: string;
    }>();
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export function requireRoles(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
}

export async function assertCaseBelongsToOrg(
  caseId: string,
  organizationId: string
) {
  const c = await prisma.case.findFirst({
    where: { id: caseId, organizationId },
    select: { id: true },
  });
  return !!c;
}
