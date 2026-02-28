import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const eventInput = v.object({
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
});

export const ingestMany = mutation({
  args: {
    events: v.array(eventInput),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const event of args.events) {
      const existing = await ctx.db
        .query("openrouterEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", event.eventId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, event);
        updated += 1;
      } else {
        await ctx.db.insert("openrouterEvents", event);
        inserted += 1;
      }
    }

    return { inserted, updated, total: args.events.length };
  },
});

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const take = Math.min(args.limit ?? 100, 500);
    return await ctx.db
      .query("openrouterEvents")
      .withIndex("by_receivedAtMs")
      .order("desc")
      .take(take);
  },
});
