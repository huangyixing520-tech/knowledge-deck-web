"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { estimateCost, plans } from "@/lib/pricing";
import { sampleCards } from "@/lib/sampleCards";

const exampleLinks = [
  "https://www.xiaoyuzhoufm.com/episode/6a1e4022ac7bdb080c348b41",
  "https://www.xiaoyuzhoufm.com/episode/6a15a2cbff7b9a8c0a5b953f"
];

const progressStages = [
  "读取正文或文字稿",
  "提取判断和结构",
  "生成阅读卡片",
  "保存到知识库"
];

const storageKeys = {
  balance: "knowledge-deck-balance",
  library: "knowledge-deck-library",
  visitor: "knowledge-deck-visitor-id",
  session: "knowledge-deck-session-id"
};

const caseCards = [
  { title: "FDE 与数字员工", tone: "case-mint", tag: "播客" },
  { title: "Harness 与 AI 创业", tone: "case-cobalt", tag: "投资" },
  { title: "一句话复述观点", tone: "case-ink", tag: "复习" },
  { title: "把长文变成卡片", tone: "case-paper", tag: "文章" }
];

const modes = ["学习", "写作", "图片", "幻灯片", "视频", "网页"];

const starterLibrary = Object.values(sampleCards).map((card) => ({
  id: card.id,
  title: card.title,
  sourceTitle: card.sourceTitle,
  sourceUrl: card.sourceUrl,
  duration: card.duration,
  cost: card.cost,
  cardUrl: `/cards/${card.id}`,
  createdAt: "样例"
}));

const previewSession = {
  user: {
    name: "Star One",
    email: "preview@knowledge.deck",
    isAdmin: false
  }
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [previewWorkspace, setPreviewWorkspace] = useState(false);
  const isSignedIn = status === "authenticated" && Boolean(session?.user);

  useEffect(() => {
    setPreviewWorkspace(
      window.location.search.includes("preview=app") &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
    );
  }, []);

  if (!isSignedIn && previewWorkspace) {
    return <Workspace session={previewSession} />;
  }

  if (!isSignedIn) {
    return <PublicEntry status={status} />;
  }

  return <Workspace session={session} />;
}

function LogoMark() {
  return (
    <span className="kd-logo-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function GoogleMark() {
  return <span className="google-mark">G</span>;
}

function PublicEntry({ status }) {
  const [view, setView] = useState("home");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (params.get("login") === "1") setView("login");
    if (error === "google") {
      setView("login");
      setAuthError("Google 登录配置还没完成。配好 OAuth Client ID 和 Secret 后，这里会进入账号选择。");
    } else if (error) {
      setView("login");
      setAuthError("登录没有完成，可以再试一次。");
    }
  }, []);

  if (view === "login") {
    return <LoginPage status={status} authError={authError} onBack={() => setView("home")} />;
  }

  return <MarketingHome onLogin={() => setView("login")} />;
}

function MarketingHome({ onLogin }) {
  return (
    <main className="ym-home-shell">
      <nav className="ym-home-nav">
        <a className="ym-brand" href="/">
          <LogoMark />
          <span>Knowledge Deck</span>
        </a>
        <div className="ym-nav-links" aria-label="站点导航">
          <a href="#overview">概览</a>
          <a href="#cases">使用案例</a>
          <a href="#workflow">技能</a>
          <a href="#prompt">提示词</a>
          <a href="#pricing">定价</a>
          <a href="#updates">更新</a>
        </div>
        <button type="button" className="ym-login-button" onClick={onLogin}>登录</button>
      </nav>

      <section id="overview" className="ym-hero">
        <div className="ym-hero-glow" />
        <div className="ym-hero-copy">
          <h1>大胆整理</h1>
          <p>一条链接，生成可复习、可分享、可沉淀的知识卡片。</p>
        </div>

        <form className="ym-prompt-box" onSubmit={(event) => {
          event.preventDefault();
          onLogin();
        }}>
          <textarea
            aria-label="输入链接"
            placeholder="让 Knowledge Deck 整理一集播客、一篇文章或一个视频"
            rows={3}
          />
          <button type="submit">开始</button>
        </form>

        <div className="ym-mode-row" aria-label="内容类型">
          {modes.map((mode) => (
            <button className={mode === "网页" ? "active" : ""} type="button" key={mode}>{mode}</button>
          ))}
        </div>

        <section id="cases" className="ym-case-grid" aria-label="案例占位">
          {caseCards.map((card) => (
            <article className={`ym-case-card ${card.tone}`} key={card.title}>
              <span>{card.tag}</span>
              <strong>{card.title}</strong>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function LoginPage({ status, authError, onBack }) {
  const isChecking = status === "loading";

  return (
    <main className="ym-login-shell">
      <section className="ym-login-panel">
        <button className="ym-login-logo" type="button" onClick={onBack} aria-label="回到首页">
          <LogoMark />
        </button>
        <div className="ym-login-stack">
          <h1>加入 Knowledge Deck</h1>
          <button type="button" className="ym-auth-button" onClick={() => signIn("google")}>
            <GoogleMark />
            {isChecking ? "正在检查登录状态" : "使用 Google 继续"}
          </button>
          <button type="button" className="ym-auth-button" disabled>
            <span className="apple-mark">A</span>
            使用 Apple 继续
          </button>
          <div className="ym-divider"><span>or</span></div>
          <input aria-label="邮箱" placeholder="输入你的邮箱" disabled />
          <button type="button" className="ym-email-button" disabled>继续</button>
          {authError && <p className="signin-error">{authError}</p>}
          <p className="ym-terms">继续即表示你同意条款和隐私政策</p>
        </div>
      </section>

      <section className="ym-login-art" aria-label="登录页图片占位">
        <div className="ym-art-placeholder">
          <span>图片占位</span>
          <p>后续可替换为你生成的品牌视觉。</p>
        </div>
        <h2>Capture deeper.</h2>
      </section>
    </main>
  );
}

function Workspace({ session }) {
  const [url, setUrl] = useState("");
  const [balance, setBalance] = useState(420);
  const [state, setState] = useState("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [library, setLibrary] = useState(starterLibrary);

  const cleanUrl = url.trim();
  const cost = useMemo(() => estimateCost(cleanUrl), [cleanUrl]);
  const hasUrl = /^https?:\/\/\S+/i.test(cleanUrl);
  const canRun = hasUrl && balance >= cost && state !== "loading";
  const primaryButtonText = state === "loading" ? "生成中" : balance < cost ? "额度不足" : "生成卡片";

  useEffect(() => {
    const savedBalance = window.localStorage.getItem(storageKeys.balance);
    const savedLibrary = window.localStorage.getItem(storageKeys.library);

    if (savedBalance) setBalance(Number(savedBalance));
    if (savedLibrary) {
      try {
        const parsed = JSON.parse(savedLibrary);
        if (Array.isArray(parsed) && parsed.length) setLibrary(parsed);
      } catch {
        window.localStorage.removeItem(storageKeys.library);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.balance, String(balance));
  }, [balance]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.library, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    if (state !== "loading") return undefined;
    setStageIndex(0);
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, progressStages.length - 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, [state]);

  async function submitJob(event) {
    event.preventDefault();
    if (!canRun) return;

    setState("loading");
    setError("");
    setResult(null);

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: cleanUrl, balance, analytics: getAnalyticsIds() })
    });
    const data = await response.json();
    await wait(1200);

    if (!response.ok) {
      setState("error");
      setError(data.error || (response.status === 401 ? "请先登录后再生成。" : "生成失败，请稍后重试。"));
      return;
    }

    const savedCard = {
      id: data.cardId,
      title: data.cardTitle,
      sourceTitle: data.sourceTitle,
      sourceUrl: cleanUrl,
      duration: data.duration,
      cost: data.cost,
      cardUrl: data.cardUrl,
      createdAt: new Date().toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
    };

    setBalance(data.balanceAfter);
    setResult({ ...data, savedCard });
    setLibrary((current) => [savedCard, ...current.filter((card) => card.id !== savedCard.id)].slice(0, 12));
    setState("ready");
  }

  function buyPlan(plan) {
    setBalance((current) => current + plan.tokens);
    setNotice(`已增加 ${plan.tokens} tokens。正式版会在这里进入支付。`);
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "purchase_clicked",
        analytics: getAnalyticsIds(),
        metadata: { plan: plan.name, tokens: plan.tokens, price: plan.price }
      })
    }).catch(() => {});
    window.setTimeout(() => setNotice(""), 3600);
  }

  return (
    <main className="ym-app-shell">
      <aside className="ym-sidebar">
        <a className="ym-brand" href="/">
          <LogoMark />
          <span>Knowledge Deck</span>
        </a>
        <nav className="ym-side-nav" aria-label="产品导航">
          <a className="active" href="#create"><span>+</span>新任务</a>
        </nav>

        <div className="ym-recent">
          <span>近期卡片</span>
          {library.slice(0, 3).map((card) => (
            <a href={card.cardUrl} key={`${card.id}-${card.createdAt}`}>{card.title}</a>
          ))}
        </div>

        <div className="ym-user-card">
          <span>{(session.user.name || session.user.email || "KD").slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{session.user.name || "Knowledge User"}</strong>
            <small>Free</small>
          </div>
          <button type="button" onClick={() => signOut()}>退出</button>
        </div>
      </aside>

      <section className="ym-workspace-card">
        <header className="ym-workspace-top">
          <button type="button" className="ym-balance-pill" onClick={() => buyPlan(plans[0])}>{balance.toLocaleString()} tokens</button>
        </header>

        <section id="create" className="ym-compose-area">
          <h1>上传播客链接，开启知识总结</h1>

          <form className="ym-compose-box" onSubmit={submitJob}>
            <textarea
              id="source-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              rows={4}
              placeholder="粘贴播客、文章或视频链接"
            />
            <div className="ym-compose-actions single">
              <button type="submit" disabled={!canRun}>{primaryButtonText}</button>
            </div>
          </form>

          <ProgressCard state={state} stageIndex={stageIndex} />
          {error && <div className="status-card error-card">{error}</div>}

          {result && (
            <div className="ym-result-card">
              <div>
                <span>已保存到知识库</span>
                <strong>{result.cardTitle}</strong>
              </div>
              <a href={result.cardUrl}>打开卡片</a>
            </div>
          )}
        </section>
      </section>

      {notice && <div className="purchase-toast">{notice}</div>}
    </main>
  );
}

function getAnalyticsIds() {
  return {
    visitorId: window.localStorage.getItem(storageKeys.visitor) || "",
    sessionId: window.sessionStorage.getItem(storageKeys.session) || ""
  };
}

function ProgressCard({ state, stageIndex }) {
  if (state !== "loading") return null;

  return (
    <div className="status-card progress-card">
      {progressStages.map((stage, index) => (
        <div className={index <= stageIndex ? "progress-step active" : "progress-step"} key={stage}>
          <span>{index + 1}</span>
          <strong>{stage}</strong>
        </div>
      ))}
    </div>
  );
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
