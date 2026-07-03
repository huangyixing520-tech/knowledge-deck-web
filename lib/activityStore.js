let poolPromise;

const memory = globalThis.__knowledgeDeckMemoryStore || {
  users: new Map(),
  events: [],
  jobs: []
};

globalThis.__knowledgeDeckMemoryStore = memory;

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

    create table if not exists kd_events (
      id text primary key,
      user_id text,
      email text,
      type text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

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

export async function trackEvent({ user, type, metadata = {} }) {
  const email = user?.email?.toLowerCase() || null;
  const userId = user?.id || email;
  const id = `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const timestamp = nowIso();

  const result = await query(
    `insert into kd_events (id, user_id, email, type, metadata, created_at)
     values ($1, $2, $3, $4, $5, now())
     returning *`,
    [id, userId, email, type, JSON.stringify(metadata)]
  );

  if (result) return result.rows[0];

  const event = { id, userId, email, type, metadata, createdAt: timestamp };
  memory.events.unshift(event);
  memory.events = memory.events.slice(0, 300);
  return event;
}

export async function recordJob({ user, url, cost, cardId, status }) {
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
    `select * from kd_events order by created_at desc limit 120`
  );
  const jobResult = await query(
    `select * from kd_jobs order by created_at desc limit 80`
  );

  if (userResult && eventResult && jobResult) {
    const users = userResult.rows.map(publicUser);
    const events = eventResult.rows.map((event) => ({
      id: event.id,
      email: event.email,
      type: event.type,
      metadata: event.metadata,
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
    return summarize({ users, events, jobs, mode: "database" });
  }

  return summarize({
    users: Array.from(memory.users.values()).map(publicUser),
    events: memory.events,
    jobs: memory.jobs,
    mode: "memory"
  });
}

function summarize({ users, events, jobs, mode }) {
  const today = new Date().toISOString().slice(0, 10);
  const eventsToday = events.filter((event) => String(event.createdAt || event.created_at).startsWith(today));
  const jobsToday = jobs.filter((job) => String(job.createdAt || job.created_at).startsWith(today));
  const newUsersToday = users.filter((user) => String(user.firstSeenAt).startsWith(today));

  return {
    mode,
    metrics: {
      totalUsers: users.length,
      newUsersToday: newUsersToday.length,
      jobsToday: jobsToday.length,
      eventsToday: eventsToday.length
    },
    users,
    events,
    jobs
  };
}
