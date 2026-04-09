import type { JSONSchema7 } from "json-schema";

// ── Shared primitives ──────────────────────────────────────────────────────────

export const UUIDSchema: JSONSchema7 = { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" };
export const TimestampSchema: JSONSchema7 = { type: "string", format: "date-time" };
export const AnyObjectSchema: JSONSchema7 = { type: "object", additionalProperties: true };
export const ErrorSchema: JSONSchema7 = {
  type: "object",
  required: ["error"],
  properties: { error: { type: "string" } },
};

// ── Timeline schemas ───────────────────────────────────────────────────────────

export const TimelineSchema: JSONSchema7 = {
  type: "object",
  required: ["id", "owner", "name", "description", "created_at"],
  properties: {
    id: UUIDSchema,
    owner: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    created_at: TimestampSchema,
  },
};

export const TimelineEntrySchema: JSONSchema7 = {
  type: "object",
  required: ["id", "timeline_id", "seq", "payload", "created_at"],
  properties: {
    id: UUIDSchema,
    timeline_id: UUIDSchema,
    seq: { type: "integer", minimum: 1 },
    payload: AnyObjectSchema,
    created_at: TimestampSchema,
  },
};

// ── Document schemas ───────────────────────────────────────────────────────────

export const DocumentSchema: JSONSchema7 = {
  type: "object",
  required: ["id", "owner", "name", "definition", "initialized", "created_at", "updated_at"],
  properties: {
    id: UUIDSchema,
    owner: { type: "string" },
    name: { type: "string" },
    definition: AnyObjectSchema,
    state: { oneOf: [AnyObjectSchema, { type: "null" }] },
    initialized: { type: "boolean" },
    changes_count: { type: "integer", minimum: 0 },
    created_at: TimestampSchema,
    updated_at: TimestampSchema,
  },
};

export const DocumentHistoryEntrySchema: JSONSchema7 = {
  type: "object",
  required: ["id", "document_id", "seq", "event", "created_at"],
  properties: {
    id: { type: "integer" },
    document_id: UUIDSchema,
    seq: { type: "integer", minimum: 1 },
    event: AnyObjectSchema,
    diff: { oneOf: [{ type: "array", items: AnyObjectSchema }, { type: "null" }] },
    created_at: TimestampSchema,
  },
};
