import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/activityStore";

function formatTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortUrl(url) {
  if (!url) return "-";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.slice(0, 58);
  } catch {
    return String(url).slice(0, 58);
  }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!isAdminEmail(email)) {
    return (
      <main className="admin-shell">
        <section className="admin-denied">
          <p className="kicker">Admin</p>
          <h1>你还没有后台权限</h1>
          <p>请先用管理员 Google 账号登录。第一版后台只对配置在 `ADMIN_EMAILS` 里的邮箱开放。</p>
          <Link href="/">回到首页</Link>
        </section>
      </main>
    );
  }

  const snapshot = await getAdminSnapshot();
  const metrics = [
    ["总用户", snapshot.metrics.totalUsers],
    ["今日新增", snapshot.metrics.newUsersToday],
    ["今日生成", snapshot.metrics.jobsToday],
    ["今日事件", snapshot.metrics.eventsToday]
  ];

  return (
    <main className="admin-shell">
      <nav className="admin-topbar">
        <div>
          <p className="kicker">Knowledge Deck Admin</p>
          <h1>用户和行为后台</h1>
        </div>
        <div className="admin-actions">
          <span>{snapshot.mode === "database" ? "数据库模式" : "内存预览模式"}</span>
          <Link href="/">回到产品</Link>
        </div>
      </nav>

      <section className="admin-metrics">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="admin-grid">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <h2>最近用户</h2>
            <span>{snapshot.users.length}</span>
          </div>
          <div className="admin-list">
            {snapshot.users.length === 0 ? (
              <p className="empty-copy">还没有登录用户。完成 Google 登录后会出现在这里。</p>
            ) : (
              snapshot.users.map((user) => (
                <div className="admin-user-row" key={user.email}>
                  {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : <span />}
                  <div>
                    <strong>{user.name || user.email}</strong>
                    <small>{user.email}</small>
                  </div>
                  <em>{formatTime(user.lastSeenAt)}</em>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <h2>生成记录</h2>
            <span>{snapshot.jobs.length}</span>
          </div>
          <div className="admin-list compact">
            {snapshot.jobs.length === 0 ? (
              <p className="empty-copy">还没有生成任务。</p>
            ) : (
              snapshot.jobs.map((job) => (
                <div className="admin-job-row" key={job.id}>
                  <strong>{job.email || "匿名用户"}</strong>
                  <span>{shortUrl(job.sourceUrl)}</span>
                  <small>{job.cost} tokens · {job.status} · {formatTime(job.createdAt)}</small>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="admin-panel wide">
          <div className="admin-panel-head">
            <h2>行为事件</h2>
            <span>{snapshot.events.length}</span>
          </div>
          <div className="event-table">
            {snapshot.events.length === 0 ? (
              <p className="empty-copy">用户登录、生成、分享等行为会记录在这里。</p>
            ) : (
              snapshot.events.map((event) => (
                <div className="event-row" key={event.id}>
                  <strong>{event.type}</strong>
                  <span>{event.email || "-"}</span>
                  <small>{formatTime(event.createdAt)}</small>
                  <code>{JSON.stringify(event.metadata || {})}</code>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
