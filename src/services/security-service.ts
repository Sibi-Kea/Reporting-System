import { randomUUID } from "crypto";
import { GpsEnforcementMode } from "@prisma/client";
import { addMinutes } from "date-fns";
import { decryptJson, encryptJson } from "@/lib/encryption";
import { cosineSimilarity } from "@/lib/face-template";
import { haversineDistanceMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { createSignedQrToken, hashQrToken, verifySignedQrToken } from "@/lib/qr";
import { tenantHasFeature } from "@/lib/tenant";
import { biometricTemplateSchema, officeLocationSchema, qrClockCodeSchema } from "@/lib/validations";
import { logAudit } from "@/services/audit-service";

async function assertTenantFeature(companyId: string, feature: "gps" | "qr" | "face" | "insights") {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
    },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  if (!tenantHasFeature(company.subscriptionPlan, feature)) {
    throw new Error(`The ${feature} feature is not available on this subscription plan.`);
  }
}

async function validateQrAssociations(companyId: string, officeLocationId: string, departmentId?: string | null) {
  const [officeLocation, department] = await Promise.all([
    prisma.officeLocation.findFirst({
      where: {
        id: officeLocationId,
        companyId,
      },
    }),
    departmentId
      ? prisma.department.findFirst({
          where: {
            id: departmentId,
            companyId,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!officeLocation) {
    throw new Error("Selected office location is invalid for this company.");
  }

  if (departmentId && !department) {
    throw new Error("Selected department is invalid for this company.");
  }
}

export async function getClockSecurityContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: true,
      shift: true,
      biometricProfile: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const [settings, officeLocations, qrCodes] = await Promise.all([
    prisma.systemSetting.findUnique({
      where: { companyId: user.companyId },
    }),
    prisma.officeLocation.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.qrClockCode.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      include: {
        officeLocation: true,
        department: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  return {
    user,
    settings,
    officeLocations,
    qrCodes,
    features: {
      gps: tenantHasFeature(user.company.subscriptionPlan, "gps"),
      qr: tenantHasFeature(user.company.subscriptionPlan, "qr"),
      face: tenantHasFeature(user.company.subscriptionPlan, "face"),
      insights: tenantHasFeature(user.company.subscriptionPlan, "insights"),
    },
  };
}

export async function enrollBiometric(userId: string, payload: unknown) {
  const parsed = biometricTemplateSchema.parse(payload);
  const context = await getClockSecurityContext(userId);

  if (!context.features.face || !context.settings?.faceClockingEnabled) {
    throw new Error("Face recognition is not enabled for this tenant.");
  }

  const vector = parsed.vector;
  const biometricProfile = await prisma.biometricProfile.upsert({
    where: {
      userId,
    },
    update: {
      encryptedTemplate: encryptJson(vector),
      isActive: true,
      lastVerifiedAt: null,
      enrolledAt: new Date(),
    },
    create: {
      companyId: context.user.companyId,
      userId,
      encryptedTemplate: encryptJson(vector),
    },
  });

  await logAudit({
    companyId: context.user.companyId,
    userId,
    action: "UPDATE",
    entity: "biometric-profile",
    entityId: biometricProfile.id,
    metadata: {
      enrolledAt: biometricProfile.enrolledAt.toISOString(),
    },
  });

  return biometricProfile;
}

export async function verifyBiometric(userId: string, vector: number[], livenessPassed: boolean) {
  const context = await getClockSecurityContext(userId);

  if (!context.user.biometricProfile?.encryptedTemplate || !context.user.biometricProfile.isActive) {
    throw new Error("No biometric profile is enrolled.");
  }

  if (!livenessPassed) {
    throw new Error("Liveness challenge failed.");
  }

  const enrolledVector = decryptJson<number[]>(context.user.biometricProfile.encryptedTemplate);
  const similarity = cosineSimilarity(enrolledVector, vector);
  const passed = similarity >= (context.settings?.faceMatchThreshold ?? 0.92);

  if (passed) {
    await prisma.biometricProfile.update({
      where: {
        userId,
      },
      data: {
        lastVerifiedAt: new Date(),
      },
    });
  }

  return {
    passed,
    similarity,
  };
}

export async function evaluateClockLocation(companyId: string, latitude?: number, longitude?: number) {
  const [company, settings, locations] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
    }),
    prisma.systemSetting.findUnique({
      where: { companyId },
    }),
    prisma.officeLocation.findMany({
      where: {
        companyId,
        isActive: true,
      },
    }),
  ]);

  if (!company) {
    throw new Error("Company not found.");
  }

  if (!tenantHasFeature(company.subscriptionPlan, "gps")) {
    return {
      allowed: true,
      remote: false,
      officeLocation: null,
      distanceMeters: null,
    };
  }

  if (latitude === undefined || longitude === undefined) {
    if (company.gpsEnforced || settings?.gpsEnforced) {
      throw new Error("GPS coordinates are required for clocking.");
    }

    return {
      allowed: true,
      remote: false,
      officeLocation: null,
      distanceMeters: null,
    };
  }

  const nearest = locations
    .map((location) => ({
      location,
      distanceMeters: haversineDistanceMeters(
        {
          latitude,
          longitude,
        },
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      ),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];

  if (!nearest) {
    const remoteAllowed = settings?.allowRemoteClocking ?? company.allowRemoteClocking;
    return {
      allowed: remoteAllowed && (settings?.gpsEnforcementMode ?? GpsEnforcementMode.MARK_REMOTE) !== GpsEnforcementMode.BLOCK,
      remote: true,
      officeLocation: null,
      distanceMeters: null,
    };
  }

  const insideRadius = nearest.distanceMeters <= nearest.location.radiusMeters;
  const remoteAllowed = settings?.allowRemoteClocking ?? company.allowRemoteClocking;

  if (!insideRadius && (!remoteAllowed || (settings?.gpsEnforcementMode ?? GpsEnforcementMode.MARK_REMOTE) === GpsEnforcementMode.BLOCK)) {
    return {
      allowed: false,
      remote: false,
      officeLocation: nearest.location,
      distanceMeters: nearest.distanceMeters,
    };
  }

  return {
    allowed: true,
    remote: !insideRadius,
    officeLocation: nearest.location,
    distanceMeters: nearest.distanceMeters,
  };
}

export async function listOfficeLocations(companyId: string) {
  return prisma.officeLocation.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createOfficeLocation(companyId: string, actorId: string, payload: unknown) {
  await assertTenantFeature(companyId, "gps");
  const data = officeLocationSchema.parse(payload);
  const location = await prisma.officeLocation.create({
    data: {
      companyId,
      ...data,
    },
  });

  await logAudit({
    companyId,
    userId: actorId,
    action: "CREATE",
    entity: "office-location",
    entityId: location.id,
    metadata: {
      name: location.name,
    },
  });

  return location;
}

export async function updateOfficeLocation(locationId: string, companyId: string, actorId: string, payload: unknown) {
  await assertTenantFeature(companyId, "gps");
  const data = officeLocationSchema.partial().parse(payload);
  const existing = await prisma.officeLocation.findFirst({
    where: {
      id: locationId,
      companyId,
    },
  });

  if (!existing) {
    throw new Error("Office location not found.");
  }

  const location = await prisma.officeLocation.update({
    where: {
      id: locationId,
    },
    data,
  });

  await logAudit({
    companyId,
    userId: actorId,
    action: "UPDATE",
    entity: "office-location",
    entityId: location.id,
    metadata: {
      name: location.name,
    },
  });

  return location;
}

export async function listQrClockCodes(companyId: string) {
  return prisma.qrClockCode.findMany({
    where: { companyId },
    include: {
      officeLocation: true,
      department: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function createQrClockCode(companyId: string, actorId: string, payload: unknown) {
  await assertTenantFeature(companyId, "qr");
  const data = qrClockCodeSchema.parse(payload);
  await validateQrAssociations(companyId, data.officeLocationId, data.departmentId);
  const codeId = randomUUID();
  const token = createSignedQrToken({
    companyId,
    codeId,
    expiresAt: addMinutes(new Date(), data.rotationMinutes).getTime(),
  });
  const code = await prisma.qrClockCode.create({
    data: {
      id: codeId,
      companyId,
      officeLocationId: data.officeLocationId,
      departmentId: data.departmentId ?? null,
      label: data.label,
      rotationMinutes: data.rotationMinutes,
      currentTokenHash: hashQrToken(token),
      lastIssuedAt: new Date(),
      expiresAt: addMinutes(new Date(), data.rotationMinutes),
      isActive: data.isActive,
    },
    include: {
      officeLocation: true,
      department: true,
    },
  });

  await logAudit({
    companyId,
    userId: actorId,
    action: "CREATE",
    entity: "qr-clock-code",
    entityId: code.id,
    metadata: {
      label: code.label,
    },
  });

  return {
    code,
    token,
  };
}

export async function updateQrClockCode(codeId: string, companyId: string, actorId: string, payload: unknown) {
  await assertTenantFeature(companyId, "qr");
  const data = qrClockCodeSchema.partial().parse(payload);
  const existing = await prisma.qrClockCode.findFirst({
    where: {
      id: codeId,
      companyId,
    },
  });

  if (!existing) {
    throw new Error("QR clock code not found.");
  }

  await validateQrAssociations(companyId, data.officeLocationId ?? existing.officeLocationId, data.departmentId === undefined ? existing.departmentId : data.departmentId);

  const code = await prisma.qrClockCode.update({
    where: {
      id: codeId,
    },
    data: {
      officeLocationId: data.officeLocationId,
      departmentId: data.departmentId,
      label: data.label,
      rotationMinutes: data.rotationMinutes,
      isActive: data.isActive,
    },
    include: {
      officeLocation: true,
      department: true,
    },
  });

  await logAudit({
    companyId,
    userId: actorId,
    action: "UPDATE",
    entity: "qr-clock-code",
    entityId: code.id,
    metadata: {
      label: code.label,
    },
  });

  return code;
}

export async function issueQrClockCode(companyId: string, codeId: string) {
  await assertTenantFeature(companyId, "qr");
  const code = await prisma.qrClockCode.findFirst({
    where: {
      id: codeId,
      companyId,
      isActive: true,
    },
    include: {
      officeLocation: true,
      department: true,
    },
  });

  if (!code) {
    throw new Error("QR code access point not found.");
  }

  const expiresAt = addMinutes(new Date(), code.rotationMinutes);
  const token = createSignedQrToken({
    companyId,
    codeId: code.id,
    expiresAt: expiresAt.getTime(),
  });

  await prisma.qrClockCode.update({
    where: { id: code.id },
    data: {
      currentTokenHash: hashQrToken(token),
      lastIssuedAt: new Date(),
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    code,
  };
}

export async function verifyQrClockToken(companyId: string, token: string) {
  await assertTenantFeature(companyId, "qr");
  const payload = verifySignedQrToken(token);

  if (!payload || payload.companyId !== companyId || payload.expiresAt < Date.now()) {
    throw new Error("QR code is invalid or expired.");
  }

  const code = await prisma.qrClockCode.findFirst({
    where: {
      id: payload.codeId,
      companyId,
      isActive: true,
      currentTokenHash: hashQrToken(token),
    },
    include: {
      officeLocation: true,
      department: true,
    },
  });

  if (!code) {
    throw new Error("QR code is invalid or expired.");
  }

  return code;
}
