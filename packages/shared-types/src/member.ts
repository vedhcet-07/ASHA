import { z } from "zod";

// ─── Member Skill ──────────────────────────────────────────────────────────────

export const MemberSkillEnum = z.enum([
  "CUTTING",
  "STITCHING",
  "TAILORING",
  "EMBROIDERY",
  "PACKING",
  "QUALITY_CHECK",
  "DELIVERY",
  "ACCOUNTING",
  "OTHER",
]);

export type MemberSkill = z.infer<typeof MemberSkillEnum>;

// ─── Availability Status ───────────────────────────────────────────────────────

export const AvailabilityStatusEnum = z.enum([
  "AVAILABLE",
  "PARTIALLY_AVAILABLE",
  "UNAVAILABLE",
]);

export type AvailabilityStatus = z.infer<typeof AvailabilityStatusEnum>;

// ─── Member ────────────────────────────────────────────────────────────────────

export const MemberSchema = z.object({
  id: z.string().uuid(),
  shgId: z.string().uuid(),
  fullName: z.string().min(1),
  phone: z.string().min(10),
  preferredLanguage: z.string().default("hi"),
  availability: AvailabilityStatusEnum,
  isLeader: z.boolean().default(false),
  joinedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Member = z.infer<typeof MemberSchema>;

// ─── Member Skill Entry ────────────────────────────────────────────────────────

export const MemberSkillEntrySchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  skill: MemberSkillEnum,
  proficiencyLevel: z.number().int().min(1).max(5),
  yearsOfExperience: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type MemberSkillEntry = z.infer<typeof MemberSkillEntrySchema>;
