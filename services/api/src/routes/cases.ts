/**
 * Production case routes – Prisma-backed, multi-tenant, auth-required.
 * Human mediator gate is enforced before a case can be marked ACCEPTED.
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import Redis from "ioredis";
import { authenticate, requireRoles } from "../middleware/auth.js";
import {
  createCase,
  getCaseForOrg,
  listCasesForOrg,
  submitClaims,
  markUnderAnalysis,
  saveProposal,
  markHumanReviewed,
} from "../services/caseRepository.js";
import { prisma } from "../db/prisma.js";
import { CaseStatus } from "@prisma/client";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379/0");

const CreateCaseSchema = z.object({
  title: z.string().min(3).max(200),
  jurisdiction: z.string().default("US-CA"),
  tenantEmail: z.string().email().optional(),
  landlordEmail: z.string().email().optional(),
});

const SubmitClaimsSchema = z.object({
  role: z.enum(["tenant", "landlord"]),
  claims: z.string().min(10),
  evidenceSummaries: z.array(z.string()).optional(),
});

export async function caseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/cases", async (request, reply) => {
    const body = CreateCaseSchema.parse(request.body);
    const user = request.user!;
    const record = await createCase({
      organizationId: user.organizationId,
      createdById: user.id,
      title: body.title,
      jurisdiction: body.jurisdiction,
      tenantEmail: body.tenantEmail,
      landlordEmail: body.landlordEmail,
    });
    return reply.status(201).send(record);
  });

  app.get("/cases", async (request) => {
    const user = request.user!;
    const status = (request.query as any)?.status as CaseStatus | undefined;
    return listCasesForOrg(user.organizationId, { status, take: 100 });
  });

  app.get("/cases/:id", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const record = await getCaseForOrg(id, user.organizationId);
    if (!record) return reply.status(404).send({ error: "Case not found" });
    return record;
  });

  app.post("/cases/:id/claims", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = SubmitClaimsSchema.parse(request.body);
    const record = await submitClaims(
      id,
      user.organizationId,
      user.id,
      body.role,
      body.claims,
      body.evidenceSummaries
    );
    if (!record) return reply.status(404).send({ error: "Case not found" });
    return record;
  });

  app.post("/cases/:id/analyze", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const record = await getCaseForOrg(id, user.organizationId);
    if (!record) return reply.status(404).send({ error: "Case not found" });
    if (!record.tenantClaims && !record.landlordClaims) {
      return reply.status(400).send({
        error: "At least one party must submit claims before analysis",
      });
    }

    const job = {
      case_id: id,
      organization_id: user.organizationId,
      lease_text:
        (request.body as any)?.leaseText ??
        "No lease text provided – extract from uploaded PDF in production.",
      tenant_claims: record.tenantClaims ?? "",
      landlord_claims: record.landlordClaims ?? "",
      evidence_summaries: record.evidenceSummaries,
      jurisdiction: record.jurisdiction,
    };
    await redis.lpush("mediation:jobs", JSON.stringify(job));
    await markUnderAnalysis(id, user.organizationId, user.id);
    return { message: "Analysis job queued", caseId: id, status: "UNDER_ANALYSIS" };
  });

  app.get("/cases/:id/proposal", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const record = await getCaseForOrg(id, user.organizationId);
    if (!record) return reply.status(404).send({ error: "Case not found" });

    const raw = await redis.get(`mediation:result:${id}`);
    if (raw) {
      const result = JSON.parse(raw);
      if (result.proposal && !record.proposalJson) {
        await saveProposal(
          id,
          user.organizationId,
          result.proposal,
          result.extracted_terms,
          result.classified_issues
        );
      }
      return {
        status: record.status,
        proposal: result.proposal ?? record.proposalJson,
        extractedTerms: result.extracted_terms ?? record.extractedTerms,
        classifiedIssues: result.classified_issues ?? record.classifiedIssues,
        humanReviewed: record.humanReviewed,
        errors: result.errors,
        disclaimer:
          "Non-binding proposal only. Requires human mediator review before acceptance.",
      };
    }

    return {
      status: record.status,
      proposal: record.proposalJson,
      humanReviewed: record.humanReviewed,
      message: record.proposalJson
        ? "Proposal available"
        : "Still processing or no result yet",
    };
  });

  /** HUMAN MEDIATOR GATE – only MEDIATOR or ADMIN */
  app.post(
    "/cases/:id/review",
    { preHandler: [requireRoles("MEDIATOR", "ADMIN")] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };
      const record = await getCaseForOrg(id, user.organizationId);
      if (!record) return reply.status(404).send({ error: "Case not found" });
      if (!record.proposalJson && record.status !== CaseStatus.PROPOSAL_READY) {
        return reply.status(400).send({ error: "No proposal available to review" });
      }
      await markHumanReviewed(id, user.organizationId, user.id);
      await prisma.auditEvent.create({
        data: {
          caseId: id,
          userId: user.id,
          organizationId: user.organizationId,
          action: "human_review_approved",
        },
      });
      return { message: "Marked as human-reviewed", caseId: id };
    }
  );

  /** Accept – blocked unless humanReviewed === true */
  app.post("/cases/:id/accept", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const record = await getCaseForOrg(id, user.organizationId);
    if (!record) return reply.status(404).send({ error: "Case not found" });

    if (!record.humanReviewed) {
      return reply.status(403).send({
        error:
          "Human mediator review required before acceptance. A MEDIATOR or ADMIN must approve the proposal first.",
        code: "HUMAN_REVIEW_REQUIRED",
      });
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: CaseStatus.ACCEPTED,
        auditEvents: {
          create: {
            action: "case_accepted",
            userId: user.id,
            organizationId: user.organizationId,
          },
        },
      },
    });
    return updated;
  });
}
