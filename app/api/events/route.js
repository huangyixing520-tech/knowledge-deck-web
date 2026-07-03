import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { trackEvent, upsertUser } from "@/lib/activityStore";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "").trim();

  if (!type) {
    return NextResponse.json({ error: "缺少事件类型。" }, { status: 400 });
  }

  await upsertUser(session.user);
  await trackEvent({
    user: session.user,
    type,
    metadata: body.metadata || {}
  });

  return NextResponse.json({ ok: true });
}
