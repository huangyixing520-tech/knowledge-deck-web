"use client";

import { useEffect, useMemo, useState } from "react";

const storageKeys = {
  visitor: "knowledge-deck-visitor-id",
  session: "knowledge-deck-session-id"
};

export default function CardActions({ card }) {
  const [copied, setCopied] = useState(false);
  const markdown = useMemo(() => toMarkdown(card), [card]);
  const encodedMarkdown = encodeURIComponent(markdown);

  useEffect(() => {
    trackCardEvent("card_opened", card);
  }, [card]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    trackCardEvent("card_link_copied", card);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="reader-actions">
      <a href="/">回到知识库</a>
      <button type="button" onClick={copyLink}>{copied ? "已复制" : "复制链接"}</button>
      <a
        href={`data:text/markdown;charset=utf-8,${encodedMarkdown}`}
        download={`${card.id}.md`}
        onClick={() => trackCardEvent("card_markdown_exported", card)}
      >
        导出 Markdown
      </a>
    </div>
  );
}

function trackCardEvent(type, card) {
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      visitorId: window.localStorage.getItem(storageKeys.visitor) || "",
      sessionId: window.sessionStorage.getItem(storageKeys.session) || "",
      metadata: {
        cardId: card.id,
        sourceUrl: card.sourceUrl
      },
      context: {
        pagePath: window.location.pathname,
        pageTitle: document.title
      }
    }),
    keepalive: true
  }).catch(() => {});
}

function toMarkdown(card) {
  const judgments = card.judgments.map((item) => (
    `## ${item.title}

时间：${item.time}

${item.body}

为什么重要：${item.why}

怎么用：${item.use}`
  )).join("\n\n");

  const quotes = card.quotes.map((quote) => `> ${quote.text}\n\n${quote.anchor}`).join("\n\n");

  return `# ${card.title}

来源：${card.sourceTitle}
链接：${card.sourceUrl}

${card.thesis}

${judgments}

## 记忆锚点

${quotes}
`;
}
