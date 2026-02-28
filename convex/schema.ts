import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  openrouterEvents: defineTable({
    eventId: v.string(),
    traceId: v.string(),
    spanId: v.string(),
    parentSpanId: v.optional(v.string()),
    name: v.string(),
    startTimeUnixNano: v.optional(v.string()),
    endTimeUnixNano: v.optional(v.string()),
    receivedAtMs: v.number(),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    source: v.optional(v.string()),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    cost: v.optional(v.number()),
    statusCode: v.optional(v.number()),
    prompt: v.optional(v.string()),
    completion: v.optional(v.string()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_receivedAtMs", ["receivedAtMs"]),
});
