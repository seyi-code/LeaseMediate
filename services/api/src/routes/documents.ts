/**
 * Document upload → malware scan → storage → optional agent handoff.
 * Only documents with scanStatus === 'clean' may be used in analysis.
 */
import { FastifyInstance } from "fastify";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { authenticate } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
import { scanBuffer, sha256, isDocumentSafe } from "../services/malwareScan.js";
import { getCaseForOrg } from "../services/caseRepository.js";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379/0");
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function documentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  app.post("/cases/:caseId/documents", async (request, reply) => {
    const user = request.user!;
    const { caseId } = request.params as { caseId: string };

    const caseRecord = await getCaseForOrg(caseId, user.organizationId);
    if (!caseRecord) return reply.status(404).send({ error: "Case not found" });

    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const hash = sha256(buffer);
    const ext = path.extname(data.filename) || ".bin";
    const storageKey = `${user.organizationId}/${caseId}/${randomUUID()}${ext}`;
    const diskPath = path.join(UPLOAD_DIR, storageKey);
    await fs.mkdir(path.dirname(diskPath), { recursive: true });
    await fs.writeFile(diskPath, buffer);

    const scanResult = await scanBuffer(buffer, data.filename);

    const doc = await prisma.document.create({
      data: {
        caseId,
        filename: data.filename,
        contentType: data.mimetype,
        sizeBytes: buffer.length,
        storageKey,
        sha256: hash,
        scanStatus: scanResult.status,
        scanEngine: scanResult.engine,
        scannedAt: new Date(),
        uploadedById: user.id,
      },
    });

    await prisma.auditEvent.create({
      data: {
        caseId,
        userId: user.id,
        organizationId: user.organizationId,
        action: "document_uploaded",
        metadata: {
          documentId: doc.id,
          scanStatus: scanResult.status,
          filename: data.filename,
        },
      },
    });

    if (scanResult.status === "infected") {
      return reply.status(422).send({
        error: "File failed malware scan",
        documentId: doc.id,
        scan: scanResult,
      });
    }

    if (scanResult.status === "error" || scanResult.status === "pending") {
      return reply.status(202).send({
        message: "Upload stored but not yet clean – cannot use in analysis until scan is clean",
        documentId: doc.id,
        scan: scanResult,
      });
    }

    return reply.status(201).send({
      documentId: doc.id,
      filename: doc.filename,
      sha256: doc.sha256,
      scanStatus: doc.scanStatus,
      sizeBytes: doc.sizeBytes,
    });
  });

  app.get("/cases/:caseId/documents", async (request, reply) => {
    const user = request.user!;
    const { caseId } = request.params as { caseId: string };
    const caseRecord = await getCaseForOrg(caseId, user.organizationId);
    if (!caseRecord) return reply.status(404).send({ error: "Case not found" });
    return prisma.document.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        contentType: true,
        sizeBytes: true,
        sha256: true,
        scanStatus: true,
        scanEngine: true,
        scannedAt: true,
        createdAt: true,
      },
    });
  });

  app.post("/cases/:caseId/analyze-with-document", async (request, reply) => {
    const user = request.user!;
    const { caseId } = request.params as { caseId: string };
    const body = (request.body as any) || {};
    const documentId = body.documentId as string | undefined;

    const caseRecord = await getCaseForOrg(caseId, user.organizationId);
    if (!caseRecord) return reply.status(404).send({ error: "Case not found" });

    if (!caseRecord.tenantClaims && !caseRecord.landlordClaims) {
      return reply.status(400).send({
        error: "At least one party must submit claims before analysis",
      });
    }

    let leasePdfPath: string | undefined;
    let leaseText: string | undefined = body.leaseText;

    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, caseId },
      });
      if (!doc) return reply.status(404).send({ error: "Document not found" });
      if (!isDocumentSafe(doc.scanStatus)) {
        return reply.status(422).send({
          error: "Document is not clean – cannot use in analysis",
          scanStatus: doc.scanStatus,
        });
      }
      leasePdfPath = path.join(UPLOAD_DIR, doc.storageKey);
    }

    if (!leaseText && !leasePdfPath) {
      return reply.status(400).send({
        error: "Provide documentId (clean PDF) or leaseText",
      });
    }

    const job = {
      case_id: caseId,
      organization_id: user.organizationId,
      lease_text: leaseText ?? "",
      lease_pdf_path: leasePdfPath,
      tenant_claims: caseRecord.tenantClaims ?? "",
      landlord_claims: caseRecord.landlordClaims ?? "",
      evidence_summaries: caseRecord.evidenceSummaries,
      jurisdiction: caseRecord.jurisdiction,
    };

    await redis.lpush("mediation:jobs", JSON.stringify(job));

    await prisma.case.update({
      where: { id: caseId },
      data: {
        status: "UNDER_ANALYSIS",
        leaseDocumentId: documentId,
        auditEvents: {
          create: {
            action: "analysis_queued_with_document",
            userId: user.id,
            organizationId: user.organizationId,
            metadata: { documentId },
          },
        },
      },
    });

    return {
      message: "Analysis job queued with document",
      caseId,
      documentId,
      status: "UNDER_ANALYSIS",
    };
  });
}
