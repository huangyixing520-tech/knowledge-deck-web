import { createHash } from "crypto";

let poolPromise;

const memory = globalThis.__knowledgeDeckMemoryStore || {
  users: new Map(),
  sessions: new Map(),
  events: [],
  jobs: []
};

if (!memory.sessions) memory.sessions = new Map();
if (!memory.events) memory.events = [];
if (!memory.jobs) memory.jobs = [];
if (!memory.users) memory.users = new Map();

globalThis.__knowledgeDeckMemoryStore = memory;

const sensitiveKeyPattern = /password|passcode|secret|token|cookie|authorization|credential|apikey|api_key|email|phone|mobile|address/i;

function nowIso() {
  return new Date().toISOString();
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    firstSeenAt: user.first_seen_at || user.firstSeenAt,
    lastSeenAt: user.last_seen_at || user.lastSeenAt,
    signInCount: Number(user.sign_in_count || user.signInCount || 0),
    tokenBalance: Number(user.token_balance || user.tokenBalance || 420)
  };
}

function normalizeEventType(type) {
  return String(type || "event")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .slice(0, 80) || "event";
}

function shortText(value, limit = 500) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function scrubValue(value, depth = 0) {
  if (depth > 5) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return shortText(value, 1000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => scrubValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, 80).map(([key, item]) => [
        shortText(key, 80),
        sensitiveKeyPattern.test(key) ? "[redacted]" : scrubValue(item, depth + 1)
      ])
    );
  }
  return shortText(value);
}

function sanitizeJson(value) {
  const scrubbed = scrubValue(value || {});
  const encoded = JSON.stringify(scrubbed);
  if (encoded.length <= 16000) return scrubbed;
  return { truncated: true, size: encoded.length };
}

function hashIp(ip) {
  if (!ip) return null;
  const salt = process.env.ANALYTICS_SALT || process.env.NEXTAUTH_SECRET || "knowledge-deck-dev";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function requestIp(headers) {
  const forwarded = headers.get("x-forwarded-for") || "";
  const firstForwarded = forwarded.split(",")[0]?.trim();
  return firstForwarded || headers.get("x-real-ip") || null;
}

export function getRequestContext(request) {
  if (!request) return {};
  const headers = request.headers;
  const url = new URL(request.url);
  return {
    pagePath: url.pathname,
    pageQuery: url.search ? "[present]" : "",
    referrer: shortText(headers.get("referer") || "", 600),
    userAgent: shortText(headers.get("user-agent") || "", 600),
    ipHash: hashIp(requestIp(headers))
  };
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!poolPromise) {
    poolPromise = import("pg").then(({ Pool }) => {
      const needsSsl = !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
      return new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: needsSsl ? { rejectUnauthorized: false } : false
      });
    });
  }
  return poolPromise;
}

async function query(sql, params = []) {
  const pool = await getPool();
  if (!pool) return null;
  await ensureSchema(pool);
  return pool.query(sql, params);
}

let schemaReady;

async function ensureSchema(pool) {
  if (schemaReady) return schemaReady;
  schemaReady = pool.query(`
    create table if not exists kd_users (
      id text primary key,
      email text unique not null,
      name text,
      image text,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      sign_in_count integer not null default 0,
      token_balance integer not null default 420
    );

    create table if not exists kd_sessions (
      id text primary key,
      visitor_id text,
      user_id text,
      email text,
      landing_page text,
      referrer text,
      user_agent text,
      ip_hash text,
      device jsonb not null default '{}'::jsonb,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      page_views integer not null default 0,
      event_count integer not null default 0
    );

    create table if not exists kd_events (
      id text primary key,
      user_id text,
      email text,
      type text not null,
      metadata jsonb not null default '{}'::jsonb,
      visitor_id text,
      session_id text,
      page_path text,
      referrer text,
      user_agent text,
      ip_hash text,
      created_at timestamptz not null default now()
    );

    alter table kd_events add column if not exists visitor_id text;
    alter table kd_events add column if not exists session_id text;
    alter table kd_events add column if not exists page_path text;
    alter table kd_events add column if not exists referrer text;
    alter table kd_events add column if not exists user_agent text;
    alter table kd_events add column if not exists ip_hash text;

    create table if not exists kd_jobs (
      id text primary key,
      user_id text,
      email text,
      source_url text not null,
      cost integer not null,
      card_id text,
      status text not null,
      created_at timestamptz not null default now()
    );

    create index if not exists kd_events_created_at_idx on kd_events (created_at desc);
    create index if not exists kd_events_type_idx on kd_events (type);
    create index if not exists kd_events_session_idx on kd_events (session_id);
    create index if not exists kd_sessions_last_seen_idx on kd_sessions (last_seen_at desc);
    create index if not exists kd_jobs_created_at_idx on kd_jobs (created_at desc);
  `);
  return schemaReady;
}

export async function upsertUser(user, options = {}) {
  if (!user?.email) return null;

  const countSignIn = Boolean(options.countSignIn);
  const id = user.id || user.email;
  const email = user.email.toLowerCase();
  const name = user.name || "";
  const image = user.image || "";
  const timestamp = nowIso();
  const result = await query(
    `insert into kd_users (id, email, name, image, first_seen_at, last_seen_at, sign_in_count)
     values ($1, $2, $3, $4, now(), now(), $5)
     on conflict (email) do update set
       name = excluded.name,
       image = excluded.image,
       last_seen_at = now(),
       sign_in_count = kd_users.sign_in_count + $5
     returning *`,
    [id, email, name, image, countSignIn ? 1 : 0]
  );

  if (result) return publicUser(result.rows[0]);

  const existing = memory.users.get(email);
  const next = {
    id,
    email,
    name,
    image,
    firstSeenAt: existing?.firstSeenAt || timestamp,
    lastSeenAt: timestamp,
    signInCount: (existing?.signInCount || 0) + (countSignIn ? 1 : 0),
    tokenBalance: existing?.tokenBalance || 420
  };
  memory.users.set(email, next);
  return publicUser(next);
}

async function touchSession({ user, visitorId, sessionId, context = {}, isPageView = false }) {
  if (!sessionId) return null;

  const email = user?.email?.toLowerCase() || null;
  const userId = user?.id || email;
  const device = sanitizeJson(context.device || {});
  const result = await query(
    `insert into kd_sessions (
       id, visitor_id, user_id, email, landing_page, referrer, user_agent, ip_hash, device,
       first_seen_at, last_seen_at, page_views, event_count
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now(), $10, 1)
     on conflict (id) do update set
       visitor_id = coalesce(excluded.visitor_id, kd_sessions.visitor_id),
       user_id = coalesce(excluded.user_id, kd_sessions.user_id),
       email = coalesce(excluded.email, kd_sessions.email),
       last_seen_at = now(),
       page_views = kd_sessions.page_views + $10,
       event_count = kd_sessions.event_count + 1
     returning *`,
    [
      sessionId,
      visitorId || null,
      userId,
      email,
      shortText(context.pagePath || "", 600),
      shortText(context.referrer || "", 600),
      shortText(context.userAgent || "", 600),
      context.ipHash || null,
      JSON.stringify(device),
      isPageView ? 1 : 0
    ]
  );

  if (result) return result.rows[0];

  const existing = memory.sessions.get(sessionId);
  const timestamp = nowIso();
  const next = {
    id: sessionId,
    visitorId: visitorId || existing?.visitorId || null,
    userId: userId || existing?.userId || null,
    email: email || existing?.email || null,
    landingPage: existing?.landingPage || context.pagePath || "",
    referrer: existing?.referrer || context.referrer || "",
    userAgent: existing?.userAgent || context.userAgent || "",
    ipHash: existing?.ipHash || context.ipHash || null,
    device,
    firstSeenAt: existing?.firstSeenAt || timestamp,
    lastSeenAt: timestamp,
    pageViews: (existing?.pageViews || 0) + (isPageView ? 1 : 0),
    eventCount: (existing?.eventCount || 0) + 1
  };
  memory.sessions.set(sessionId, next);
  return next;
}

export async function trackEvent({ user, type, metadata = {}, visitorId, sessionId, context = {} }) {
  const email = user?.email?.toLowerCase() || null;
  const userId = user?.id || email;
  const eventType = normalizeEventType(type);
  const id = `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const timestamp = nowIso();
  const cleanMetadata = sanitizeJson(metadata);
  const cleanContext = sanitizeJson(context);

  await touchSession({
    user,
    visitorId,
    sessionId,
    context: cleanContext,
    isPageView: eventType === "page_view"
  });

  const result = await query(
    `insert into kd_events (
       id, user_id, email, type, metadata, visitor_id, session_id, page_path, referrer, user_agent, ip_hash, created_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     returning *`,
    [
      id,
      userId,
      email,
      eventType,
      JSON.stringify(cleanMetadata),
      visitorId || null,
      sessionId || null,
      shortText(cleanContext.pagePath || "", 600),
      shortText(cleanContext.referrer || "", 600),
      shortText(cleanContext.userAgent || "", 600),
      cleanContext.ipHash || null
    ]
  );

  if (result) return result.rows[0];

  const event = {
    id,
    userId,
    email,
    type: eventType,
    metadata: cleanMetadata,
    visitorId: visitorId || null,
    sessionId: sessionId || null,
    pagePath: cleanContext.pagePath || "",
    referrer: cleanContext.referrer || "",
    userAgent: cleanContext.userAgent || "",
    ipHash: cleanContext.ipHash || null,
    createdAt: timestamp
  };
  memory.events.unshift(event);
  memory.events = memory.events.slice(0, 1000);
  return event;
}

export async function recordJob({ user, url, cost, cardId, status, visitorId, sessionId, context }) {
  const email = user?.email?.toLowerCase() || null;
  const userId = user?.id || email;
  const id = `job_${Date.now()}`;
  const timestamp = nowIso();

  const result = await query(
    `insert into kd_jobs (id, user_id, email, source_url, cost, card_id, status, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     returning *`,
    [id, userId, email, url, cost, cardId, status]
  );

  await trackEvent({
    user,
    type: "job_created",
    visitorId,
    sessionId,
    context,
    metadata: { jobId: id, url, cost, cardId, status }
  });

  if (result) return result.rows[0];

  const job = { id, userId, email, sourceUrl: url, cost, cardId, status, createdAt: timestamp };
  memory.jobs.unshift(job);
  memory.jobs = memory.jobs.slice(0, 300);
  return job;
}

export async function getAdminSnapshot() {
  const userResult = await query(
    `select * from kd_users order by last_seen_at desc limit 100`
  );
  const eventResult = await query(
    `select * from kd_events order by created_at desc limit 300`
  );
  const jobResult = await query(
    `select * from kd_jobs order by created_at desc limit 120`
  );
  const sessionResult = await query(
    `select * from kd_sessions order by last_seen_at desc limit 120`
  );

  if (userResult && eventResult && jobResult && sessionResult) {
    const users = userResult.rows.map(publicUser);
    const events = eventResult.rows.map((event) => ({
      id: event.id,
      email: event.email,
      type: event.type,
      metadata: event.metadata,
      visitorId: event.visitor_id,
      sessionId: event.session_id,
      pagePath: event.page_path,
      referrer: event.referrer,
      createdAt: event.created_at
    }));
    const jobs = jobResult.rows.map((job) => ({
      id: job.id,
      email: job.email,
      sourceUrl: job.source_url,
      cost: job.cost,
      cardId: job.card_id,
      status: job.status,
      createdAt: job.created_at
    }));
    const sessions = sessionResult.rows.map((session) => ({
      id: session.id,
      visitorId: session.visitor_id,
      email: session.email,
      landingPage: session.landing_page,
      referrer: session.referrer,
      pageViews: session.page_views,
      eventCount: session.event_count,
      firstSeenAt: session.first_seen_at,
      lastSeenAt: session.last_seen_at
    }));
    return summarize({ users, events, jobs, sessions, mode: "database" });
  }

  return summarize({
    users: Array.from(memory.users.values()).map(publicUser),
    events: memory.events,
    jobs: memory.jobs,
    sessions: Array.from(memory.sessions.values()),
    mode: "memory"
  });
}

function eventCreatedAt(event) {
  return event.createdAt || event.created_at;
}

function countBy(items, getKey, limit = 8) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function summarize({ users, events, jobs, sessions, mode }) {
  const today = new Date().toISOString().slice(0, 10);
  const eventsToday = events.filter((event) => String(eventCreatedAt(event)).startsWith(today));
  const jobsToday = jobs.filter((job) => String(job.createdAt || job.created_at).startsWith(today));
  const newUsersToday = users.filter((user) => String(user.firstSeenAt).startsWith(today));
  const sessionsToday = sessions.filter((session) => String(session.lastSeenAt || session.last_seen_at).startsWith(today));
  const anonymousVisitors = new Set(events.filter((event) => !event.email).map((event) => event.visitorId).filter(Boolean));
  const signedInVisitors = new Set(events.filter((event) => event.email).map((event) => event.email));

  return {
    mode,
    metrics: {
      totalUsers: users.length,
      newUsersToday: newUsersToday.length,
      jobsToday: jobsToday.length,
      eventsToday: eventsToday.length,
      sessionsToday: sessionsToday.length,
      anonymousVisitors: anonymousVisitors.size
    },
    funnel: [
      { label: "访问", count: countUnique(events, "visitorId") || sessions.length },
      { label: "登录", count: signedInVisitors.size },
      { label: "生成", count: jobs.length },
      { label: "打开卡片", count: events.filter((event) => event.type === "card_opened" || event.pagePath?.startsWith("/cards/")).length },
      { label: "购买点击", count: events.filter((event) => event.type === "purchase_clicked").length }
    ],
    topEvents: countBy(events, (event) => event.type),
    topPages: countBy(events.filter((event) => event.type === "page_view"), (event) => event.pagePath || event.metadata?.path),
    users,
    sessions,
    events,
    jobs
  };
}

function countUnique(items, key) {
  return new Set(items.map((item) => item[key]).filter(Boolean)).size;
}
