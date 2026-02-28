import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type OtlpValue = {
  stringValue?: string;
  intValue?: string;
  doubleValue?: number;
  boolValue?: boolean;
};

type OtlpAttribute = {
  key: string;
  value?: OtlpValue;
};

type OtlpSpan = {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  startTimeUnixNano?: string;
  endTimeUnixNano?: string;
  attributes?: OtlpAttribute[];
};

type OtlpPayload = {
  resourceSpans?: Array<{
    resource?: { attributes?: OtlpAttribute[] };
    scopeSpans?: Array<{ spans?: OtlpSpan[] }>;
  }>;
};

type EventInput = {
  eventId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano?: string;
  endTimeUnixNano?: string;
  receivedAtMs: number;
  model?: string;
  provider?: string;
  source?: string;
  userId?: string;
  sessionId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  statusCode?: number;
};

const ingestManyRef = makeFunctionReference<
  "mutation",
  { events: EventInput[] },
  { inserted: number; updated: number; total: number }
>("openrouterEvents:ingestMany");

function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable.");
  }

  return new ConvexHttpClient(convexUrl);
}

function getWebhookSecret(): string {
  const secret = process.env.OPENROUTER_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing OPENROUTER_WEBHOOK_SECRET environment variable.");
  }
  return secret;
}

function parseAttributeValue(value: OtlpValue | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value.stringValue === "string") {
    return value.stringValue;
  }
  if (typeof value.intValue === "string") {
    return value.intValue;
  }
  if (typeof value.doubleValue === "number") {
    return String(value.doubleValue);
  }
  if (typeof value.boolValue === "boolean") {
    return value.boolValue ? "true" : "false";
  }
  return undefined;
}

function buildAttributeMap(
  ...attributeSets: Array<OtlpAttribute[] | undefined>
) {
  const out = new Map<string, string>();
  for (const attributes of attributeSets) {
    for (const attribute of attributes ?? []) {
      const value = parseAttributeValue(attribute.value);
      if (value !== undefined) {
        out.set(attribute.key, value);
      }
    }
  }
  return out;
}

function pickString(
  map: Map<string, string>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = map.get(key);
    if (value && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function pickNumber(
  map: Map<string, string>,
  keys: string[],
): number | undefined {
  const raw = pickString(map, keys);
  if (!raw) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function extractEvents(
  payload: OtlpPayload,
  receivedAtMs: number,
): EventInput[] {
  const events: EventInput[] = [];

  for (const resourceSpan of payload.resourceSpans ?? []) {
    const resourceAttributes = resourceSpan.resource?.attributes;
    for (const scopeSpan of resourceSpan.scopeSpans ?? []) {
      for (const span of scopeSpan.spans ?? []) {
        if (!span.traceId || !span.spanId) {
          continue;
        }

        const attrs = buildAttributeMap(resourceAttributes, span.attributes);
        events.push({
          eventId: `${span.traceId}:${span.spanId}`,
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          name: span.name ?? "openrouter.span",
          startTimeUnixNano: span.startTimeUnixNano,
          endTimeUnixNano: span.endTimeUnixNano,
          receivedAtMs,
          model: pickString(attrs, [
            "gen_ai.request.model",
            "llm.request.model",
            "model",
          ]),
          provider: pickString(attrs, [
            "gen_ai.system",
            "provider",
            "openrouter.provider",
          ]),
          source: pickString(attrs, [
            "openrouter.api_key_name",
            "openrouter.api_key_id",
            "service.name",
          ]),
          userId: pickString(attrs, ["user.id"]),
          sessionId: pickString(attrs, ["session.id"]),
          promptTokens: pickNumber(attrs, ["gen_ai.usage.prompt_tokens"]),
          completionTokens: pickNumber(attrs, [
            "gen_ai.usage.completion_tokens",
          ]),
          totalTokens: pickNumber(attrs, ["gen_ai.usage.total_tokens"]),
          cost: pickNumber(attrs, ["gen_ai.usage.cost", "usage.cost"]),
          statusCode: pickNumber(attrs, ["http.status_code"]),
        });
      }
    }
  }

  return events;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expected = `Bearer ${getWebhookSecret()}`;
    if (authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isTestConnection =
      request.headers.get("x-test-connection")?.toLowerCase() === "true";

    const payload = (await request.json().catch(() => ({}))) as OtlpPayload;
    if (isTestConnection) {
      return NextResponse.json({ ok: true, test: true });
    }

    const events = extractEvents(payload, Date.now());
    const result = events.length
      ? await getConvexClient().mutation(ingestManyRef, { events })
      : { inserted: 0, updated: 0, total: 0 };

    return NextResponse.json({
      ok: true,
      events: events.length,
      stored: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
