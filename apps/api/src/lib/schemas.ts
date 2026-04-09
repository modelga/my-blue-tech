import { z } from "zod";

// ── Shared primitives ──────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const AnyObjectSchema = z.record(z.string(), z.unknown());
export const ErrorSchema = z.object({ error: z.string() });

// ── Timeline schemas ───────────────────────────────────────────────────────────

export const TimelineSchema = z.object({
  id: UUIDSchema,
  owner: z.string(),
  name: z.string(),
  description: z.string(),
  created_at: TimestampSchema,
});

export const TimelineEntrySchema = z.object({
  id: UUIDSchema,
  timeline_id: UUIDSchema,
  seq: z.number().int().min(1),
  payload: AnyObjectSchema,
  created_at: TimestampSchema,
});

// ── Timeline request body schemas ──────────────────────────────────────────────

export const CreateTimelineBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export const UpdateTimelineBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

// ── Document schemas ───────────────────────────────────────────────────────────

export const DocumentSchema = z.object({
  id: UUIDSchema,
  owner: z.string(),
  name: z.string(),
  definition: AnyObjectSchema,
  state: z.union([AnyObjectSchema, z.null()]).optional(),
  initialized: z.boolean(),
  changes_count: z.number().int().min(0).optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const DocumentHistoryEntrySchema = z.object({
  id: z.number().int(),
  document_id: UUIDSchema,
  seq: z.number().int().min(1),
  event: AnyObjectSchema,
  diff: z.array(AnyObjectSchema).nullable().optional(),
  created_at: TimestampSchema,
});

// ── Document request body schemas ──────────────────────────────────────────────

export const CreateDocumentBodySchema = z.object({
  name: z.string(),
  definition: AnyObjectSchema,
});

// ── Path param schemas ─────────────────────────────────────────────────────────

export const IDParamSchema = z.object({ id: z.string().uuid() });
