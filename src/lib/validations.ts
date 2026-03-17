import { CompanyStatus, GpsEnforcementMode, Role, SubscriptionPlan } from "@prisma/client";
import { z } from "zod";
import { normalizeDeviceLabel } from "@/lib/device";

const deviceSchema = z.string().min(2).max(4096).transform(normalizeDeviceLabel);

export const adminSignInSchema = z.object({
  companySlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  email: z.email(),
  password: z.string().min(8),
});

export const staffPortalSignInSchema = z.object({
  companySlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  staffCode: z.string().regex(/^\d{4,8}$/),
});

export const clockActionSchema = z.object({
  device: deviceSchema,
  location: z.string().max(180).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  shiftType: z.enum(["DAY", "EVENING", "NIGHT", "FLEX"]).optional(),
  verificationMethod: z.enum(["STANDARD", "FACE", "QR"]).default("STANDARD"),
  qrToken: z.string().max(512).optional(),
  biometricVector: z.array(z.number()).min(16).max(1024).optional(),
  livenessPassed: z.boolean().optional(),
});

export const employeeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  employeeId: z.string().min(3).max(30),
  clockPin: z
    .string()
    .regex(/^\d{4,8}$/)
    .optional()
    .or(z.literal("")),
  departmentId: z.string().nullable().optional(),
  position: z.string().max(80).optional().or(z.literal("")),
  managerId: z.string().nullable().optional(),
  shiftId: z.string().nullable().optional(),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(160).optional(),
});

const logoUrlSchema = z
  .string()
  .refine((value) => value === "" || value.startsWith("data:image/") || z.url().safeParse(value).success, "Invalid logo URL");

export const companySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  timezone: z.string().min(2).max(60),
  logoUrl: logoUrlSchema.optional().or(z.literal("")),
  subscriptionPlan: z.nativeEnum(SubscriptionPlan).default(SubscriptionPlan.STARTER),
  status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE),
});

export const settingsSchema = z.object({
  companyName: z.string().min(2).max(120),
  logoUrl: logoUrlSchema.optional().or(z.literal("")),
  timezone: z.string().min(2).max(60),
  publicLoginDefault: z.boolean(),
  quickClockEnabled: z.boolean(),
  quickClockRequirePin: z.boolean(),
  gpsEnforced: z.boolean(),
  gpsEnforcementMode: z.nativeEnum(GpsEnforcementMode),
  allowRemoteClocking: z.boolean(),
  qrClockingEnabled: z.boolean(),
  qrRotationMinutes: z.number().int().min(1).max(60),
  faceClockingEnabled: z.boolean(),
  faceMatchThreshold: z.number().min(0.5).max(1),
  enforceClockWindows: z.boolean(),
  clockInWindowStart: z.string().regex(/^\d{2}:\d{2}$/),
  clockInWindowEnd: z.string().regex(/^\d{2}:\d{2}$/),
  clockOutWindowStart: z.string().regex(/^\d{2}:\d{2}$/),
  clockOutWindowEnd: z.string().regex(/^\d{2}:\d{2}$/),
  lateThresholdMinutes: z.number().int().min(0).max(120),
  overtimeAfterMinutes: z.number().int().min(0).max(1440),
  shiftReminderMinutes: z.number().int().min(0).max(240),
  clockOutReminderMinutes: z.number().int().min(0).max(240),
  clockInGraceMinutes: z.number().int().min(0).max(120),
  ipAllowlist: z.array(z.string()).default([]),
});

export const quickClockIdentitySchema = z.object({
  companySlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  employeeId: z.string().min(3).max(30),
  clockPin: z
    .string()
    .regex(/^\d{4,8}$/)
    .optional()
    .or(z.literal("")),
});

export const quickClockActionSchema = quickClockIdentitySchema.extend({
  device: deviceSchema,
  location: z.string().max(180).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  shiftType: z.enum(["DAY", "EVENING", "NIGHT", "FLEX"]).optional(),
});

export const receptionQuerySchema = z.object({
  companySlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  codeId: z.string().optional(),
});

export const receptionDoorClockSchema = z.object({
  companySlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  staffCode: z.string().regex(/^\d{4,8}$/),
  qrToken: z.string().min(8).max(512),
  device: deviceSchema,
});

export const officeLocationSchema = z.object({
  name: z.string().min(2).max(80),
  address: z.string().max(160).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(25).max(5000),
  qrRotationMins: z.number().int().min(1).max(60).default(5),
  isActive: z.boolean().default(true),
});

export const qrClockCodeSchema = z.object({
  officeLocationId: z.string(),
  departmentId: z.string().optional().nullable(),
  label: z.string().min(2).max(80),
  rotationMinutes: z.number().int().min(1).max(60),
  isActive: z.boolean().default(true),
});

export const biometricTemplateSchema = z.object({
  vector: z.array(z.number()).min(16).max(1024),
  livenessPassed: z.boolean(),
});

export const qrTokenVerificationSchema = z.object({
  token: z.string().min(8).max(512),
});

export const reportFilterSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  departmentId: z.string().optional(),
  search: z.string().optional(),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
});
