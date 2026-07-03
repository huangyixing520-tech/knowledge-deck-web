"use client";

import { useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { estimateCost, plans } from "@/lib/pricing";

const exampleLinks = [
  "https://www.xiaoyuzhoufm.com/episode/6a1e4022ac7bdb080c348b41",
  "https://www.xiaoyuzhoufm.com/episode/6a15a2cbff7b9a8c0a5b953f"
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && Boolean(session?.user);

  if (!isSignedIn) {
    return <LoginLanding status={status} />;
  }

  return <Workspace session={session} />;
}

function GoogleMark() {
  return <span className="google-mark">G</span>;
}

function LoginLanding({ status }) {
  const isChecking = status === "loading";
  return (
    <main className="login-shell">
      <section className="login-copy">
        <nav className="login-nav">
          <div className="brand">
            <span className="brand-mark">KD</span>
            <span>Knowledge Deck</span>
          </div>
          <a href="/cards/demo-fde">看样例卡</a>
        </nav>

        <div className="login-center">
          <h1>把播客变成真正记得住的知识卡。</h1>
          <p>
            用 Google 登录后，粘贴链接即可生成可分享、可复习、可追踪的知识卡片。
          </p>

          <div className="signin-box">
            <button type="button" className="google-login-primary" onClick={() => signIn("google")}>
              <GoogleMark />
              {isChecking ? "正在检查登录状态" : "Continue with Google"}
            </button>
            <p>第一版只支持 Google 登录。你的生成记录和后台行为会从这里开始归档。</p>
          </div>
        </div>
      </section>

      <section className="login-visual" aria-label="Knowledge Deck product preview">
        <div className="google-quick-card">
          <div className="quick-card-head">
            <GoogleMark />
            <strong>Google 快捷登录</strong>
            <button type="button" onClick={() => signIn("google")} aria-label="使用 Google 登录">×</button>
          </div>
          <button type="button" className="quick-account" onClick={() => signIn("google")}>
            <span>G</span>
            <div>
              <strong>继续使用 Google</strong>
              <small>选择浏览器里的 Google 账号</small>
            </div>
          </button>
        </div>

        <div className="visual-stage">
          <div className="audio-strip">
            <span />
            <span />
            <span />
            <span />
            <span />
            <strong>52:18</strong>
          </div>
          <div className="knowledge-card hero-card">
            <small>Knowledge card</small>
            <h2>AI 能力差距，会落在工作流里</h2>
            <p>真正值得记住的不是观点本身，而是它能不能变成下一次行动的判断标准。</p>
            <div className="mini-grid">
              <span>Why</span>
              <span>Use it</span>
            </div>
          </div>
          <div className="knowledge-card side-card">
            <small>Saved</small>
            <strong>本轮收藏 6</strong>
            <p>判断、行动、金句进入个人知识库。</p>
          </div>
          <div className="timeline-card">
            <span>03:35</span>
            <span>12:47</span>
            <span>29:00</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Workspace({ session }) {
  const [url, setUrl] = useState(exampleLinks[0]);
  const [balance, setBalance] = useState(420);
  const [state, setState] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const cost = useMemo(() => estimateCost(url), [url]);
  const canRun = /^https?:\/\//.test(url) && balance >= cost && state !== "loading";

  async function submitJob(event) {
    event.preventDefault();
    setState("loading");
    setError("");
    setResult(null);

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, balance })
    });
    const data = await response.json();

    if (!response.ok) {
      setState("error");
      setError(data.error || (response.status === 401 ? "请先登录后再生成。" : "生成失败，请稍后重试。"));
      return;
    }

    setBalance(data.balanceAfter);
    setResult(data);
    setState("ready");
  }

  function buyPlan(plan) {
    setBalance((current) => current + plan.tokens);
    setNotice(`已模拟购买 ${plan.name}：+${plan.tokens} tokens。生产版会在这里跳转到支付收银台。`);
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "purchase_clicked",
        metadata: { plan: plan.name, tokens: plan.tokens, price: plan.price }
      })
    }).catch(() => {});
    window.setTimeout(() => setNotice(""), 4200);
  }

  return (
    <main className="product-shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">KD</span>
          <span>Knowledge Deck</span>
        </div>
        <div className="nav-actions">
          <span className="pill">余额 {balance} tokens</span>
          <a href="#pricing" className="ghost-link">购买额度</a>
          {session.user.isAdmin && <a href="/admin" className="ghost-link">后台</a>}
          <div className="user-menu">
            {session.user.image && (
              <img src={session.user.image} alt="" referrerPolicy="no-referrer" />
            )}
            <span>{session.user.name || session.user.email}</span>
            <button type="button" onClick={() => signOut()}>退出</button>
          </div>
        </div>
      </nav>

      <section className="workspace">
        <aside className="left-rail">
          <p className="kicker">Podcast to Memory</p>
          <h1>把一小时播客，压缩成别人愿意转发的知识卡。</h1>
          <p className="lead">
            只基于全文、文字稿或字幕提炼；不拿简介和 shownotes 冒充内容。
            输出支持速读、深读、复述和分享。
          </p>
          <div className="proof-list">
            <span>全文优先</span>
            <span>时间戳验证</span>
            <span>滑卡记忆</span>
            <span>公开分享页</span>
          </div>
        </aside>

        <section className="generator-panel">
          <div className="panel-heading">
            <div>
              <p className="eyeline">Create a deck</p>
              <h2>粘贴链接，生成知识卡片</h2>
            </div>
            <span className="cost-badge">{cost} tokens</span>
          </div>

          <form onSubmit={submitJob} className="job-form">
            <label htmlFor="source-url">播客、文章或视频链接</label>
            <textarea
              id="source-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              rows={4}
              placeholder="https://www.xiaoyuzhoufm.com/episode/..."
            />
            <div className="form-footer">
              <div className="estimate">
                <strong>预计消耗 {cost} tokens</strong>
                <span>余额不足时会先进入购买额度，而不是开始任务。</span>
              </div>
              <button disabled={!canRun}>
                {state === "loading" ? "生成中..." : "开始生成"}
              </button>
            </div>
          </form>

          <div className="example-row">
            {exampleLinks.map((item) => (
              <button key={item} type="button" onClick={() => setUrl(item)}>
                试一个样例
              </button>
            ))}
          </div>

          {state === "loading" && (
            <div className="status-card loading-card">
              <span />
              <div>
                <strong>正在创建任务</strong>
                <p>真实版本会在这里进入转写、提炼、渲染和发布队列。</p>
              </div>
            </div>
          )}

          {error && <div className="status-card error-card">{error}</div>}

          {result && (
            <div className="result-card">
              <div>
                <p className="eyeline">Ready</p>
                <h3>样例知识卡已经生成</h3>
                <p>{result.message}</p>
              </div>
              <a href={result.cardUrl}>打开卡片</a>
            </div>
          )}
        </section>

        <aside className="right-rail">
          <div className="wallet-card">
            <p className="kicker">Token Wallet</p>
            <strong>{balance}</strong>
            <span>当前可用 tokens</span>
          </div>
          <div className="queue-card">
            <p className="kicker">Pipeline</p>
            <ol>
              <li>读取可靠内容</li>
              <li>转写或提取全文</li>
              <li>压缩成记忆结构</li>
              <li>生成分享页</li>
            </ol>
          </div>
        </aside>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="section-copy">
          <p className="kicker">Business model</p>
          <h2>按 token 售卖，先让用户为“省下的一小时”付费。</h2>
          <p>
            第一版 token 只绑定生成成本：转写、提炼、渲染和分享页。后续可以加团队知识库、导出、私有模板和批量处理。
          </p>
        </div>
        <div className="plans">
          {plans.map((plan) => (
            <article className={plan.featured ? "plan featured" : "plan"} key={plan.name}>
              <span>{plan.name}</span>
              <strong>{plan.price}</strong>
              <p>{plan.tokens} tokens</p>
              <small>{plan.note}</small>
              <button type="button" onClick={() => buyPlan(plan)}>购买</button>
            </article>
          ))}
        </div>
      </section>

      {notice && <div className="purchase-toast">{notice}</div>}
    </main>
  );
}
