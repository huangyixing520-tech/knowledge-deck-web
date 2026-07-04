import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRequestContext, trackEvent, upsertUser } from "@/lib/activityStore";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "").trim();
  const analytics = body.analytics || {};

  if (!type) {
    return NextResponse.json({ error: "缺少事件类型。" }, { status: 400 });
  }

  await upsertUser(session.user);
  await trackEvent({
    user: session.user,
    type,
    metadata: body.metadata || {},
    visitorId: analytics.visitorId,
    sessionId: analytics.sessionId,
    context: getRequestContext(request)
  });

  return NextResponse.json({ ok: true });
}
