import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  companyId: string;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        ...input,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
