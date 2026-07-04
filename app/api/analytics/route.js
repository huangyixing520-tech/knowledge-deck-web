import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRequestContext, trackEvent, upsertUser } from "@/lib/activityStore";

const rateState = globalThis.__knowledgeDeckAnalyticsRate || new Map();
globalThis.__knowledgeDeckAnalyticsRate = rateState;

function rateKey(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function isRateLimited(key) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 180;
  const current = rateState.get(key);

  if (!current || now - current.startedAt > windowMs) {
    rateState.set(key, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

function normalizeEvents(body) {
  const events = Array.isArray(body.events) ? body.events : [body];
  return events
    .filter(Boolean)
    .slice(0, 25)
    .map((event) => ({
      type: event.type || event.event || "event",
      metadata: event.metadata || event.properties || {},
      visitorId: String(event.visitorId || "").slice(0, 120) || null,
      sessionId: String(event.sessionId || "").slice(0, 120) || null,
      context: event.context || {}
    }));
}

export async function POST(request) {
  const key = rateKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json({ error: "too_many_events" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const events = normalizeEvents(body);

  if (events.length === 0) {
    return NextResponse.json({ error: "missing_event" }, { status: 400 });
  }

  const session = await getServerSession(authOptions).catch(() => null);
  const user = session?.user || null;
  const requestContext = getRequestContext(request);

  if (user) {
    await upsertUser(user);
  }

  await Promise.all(
    events.map((event) =>
      trackEvent({
        user,
        type: event.type,
        metadata: event.metadata,
        visitorId: event.visitorId,
        sessionId: event.sessionId,
        context: {
          ...requestContext,
          ...event.context,
          referrer: event.context.referrer || requestContext.referrer,
          userAgent: requestContext.userAgent,
          ipHash: requestContext.ipHash
        }
      })
    )
  );

  return NextResponse.json({ ok: true, accepted: events.length });
}
