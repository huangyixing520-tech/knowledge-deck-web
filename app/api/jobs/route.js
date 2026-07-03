import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordJob, trackEvent, upsertUser } from "@/lib/activityStore";
import { estimateCost } from "@/lib/pricing";
import { pickCardByUrl } from "@/lib/sampleCards";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "请先使用 Google 登录后再生成知识卡片。" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const url = String(body.url || "").trim();

  if (!/^https?:\/\/.+/i.test(url)) {
    return NextResponse.json(
      { error: "请输入一个有效链接。" },
      { status: 400 }
    );
  }

  const card = pickCardByUrl(url);
  const cost = estimateCost(url);
  await upsertUser(session.user);
  const job = await recordJob({
    user: session.user,
    url,
    cost,
    cardId: card.id,
    status: "ready"
  });
  await trackEvent({
    user: session.user,
    type: "card_ready",
    metadata: { jobId: job.id, cardId: card.id, cost }
  });

  return NextResponse.json({
    jobId: job.id,
    status: "ready",
    cost,
    balanceAfter: Math.max(0, Number(body.balance || 0) - cost),
    cardId: card.id,
    cardUrl: `/cards/${card.id}`,
    message:
      "MVP 当前返回样例卡片；下一步会把这里替换成真实转写、提炼和发布队列。"
  });
}
