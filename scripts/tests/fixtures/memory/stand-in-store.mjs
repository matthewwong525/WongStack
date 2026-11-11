// A memory store in plain arrays, for the core's tests: the same answers and the same who-sees-what as d1Store,
// with no database. `standInStore()` holds one data set; `as(caller)` is that caller's view of it.
import { MAX_TRANSCRIPT_BYTES, StoreError } from '../../../../.agents/plugins/memory/store/interface.mjs';

const SOURCES = ['save', 'backfill', 'migration', 'consolidation'];
const TYPE_ORDER = { feedback: 1, project: 2, reference: 3, user: 4 };
const forbidden = reason => new StoreError(reason, { kind: 'forbidden' });
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const newest = (a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id;
const words = text => [...new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) || [])];

export function standInStore() {
  const facts = [], tags = new Map(), factTags = new Map(), sessions = new Map(), objects = new Map(), runs = [];

  function as(caller) {
    const admin = caller.role === 'admin', subject = caller.subject ?? null;
    // Shared non-personal facts plus the caller's own; a schedule owns nothing; only the admin's `everyone` sees all.
    const visible = (fact, everyone) => (everyone && admin) || (fact.type !== 'user' && fact.type !== 'feedback' && fact.shared === 1)
      || (caller.role !== 'team' && fact.owner_subject === subject);
    const ownSession = session => admin || (subject !== null && session.owner_subject === subject);
    const tagsOf = id => [...(factTags.get(id) || [])];
    const asFact = (fact, withTags) => ({ ...fact, sources: fact.session_id ? [`session:${fact.session_id}`] : [], ...(withTags ? { tags: tagsOf(fact.id) } : {}) });
    const root = name => tags.get(name)?.alias_of ?? name;

    function read(q) {
      const terms = q.terms ? words(q.terms) : [];
      const hits = fact => terms.filter(word => fact.body.toLowerCase().includes(word)).length;
      const groups = new Set((q.tags || []).filter(name => tags.has(name)).map(root));
      const branchSessions = q.branch ? [...sessions.values()].filter(s => s.branch === q.branch && ownSession(s)).map(s => s.id) : null;
      const changeSessions = q.change ? facts.filter(f => f.slug === q.change && f.session_id && visible(f, q.everyone)).map(f => f.session_id) : null;
      const kept = facts.filter(f => (q.all || f.superseded_by === null) && visible(f, q.everyone)
        && (!terms.length || hits(f) > 0)
        && (!Array.isArray(q.ids) || q.ids.map(Number).includes(f.id))
        && (!q.slug || f.slug === q.slug) && (!q.notSlug || f.slug !== q.notSlug)
        && (!q.type || f.type === q.type) && (!q.notType || f.type !== q.notType)
        && (!q.since || f.created_at >= q.since) && (!q.until || f.created_at <= q.until)
        && (!q.author || (f.author || '').toLowerCase().includes(q.author.toLowerCase()))
        && (!q.tags?.length || tagsOf(f.id).some(name => groups.has(root(name))))
        && (!(branchSessions || changeSessions) || [...(branchSessions || []), ...(changeSessions || [])].includes(f.session_id)));
      const order = q.order === 'threads-first' ? (a, b) => (a.type !== 'thread') - (b.type !== 'thread') || b.created_at.localeCompare(a.created_at)
        : q.order !== 'newest' && terms.length ? (a, b) => hits(b) - hits(a) || newest(a, b) : newest;
      const sorted = kept.sort(order);
      return (Number.isInteger(q.limit) && q.limit >= 0 ? sorted.slice(0, q.limit) : sorted).map(f => asFact(f, q.withTags));
    }

    function checkSession(session) {
      if (caller.role === 'team') throw forbidden('a schedule sign-in writes team facts only, never a session');
      const row = sessions.get(String(session.id));
      if (row && row.owner_subject !== subject) throw forbidden(`session ${session.id} belongs to another person or unassigned history`);
      if (row?.status === 'private') throw forbidden(`session ${session.id} is private and cannot be captured`);
    }
    function putSession(session) {
      const old = sessions.get(String(session.id));
      sessions.set(String(session.id), {
        id: String(session.id), agent: old?.agent ?? session.agent, author: old?.author ?? caller.email ?? null, machine: old?.machine ?? session.host ?? null,
        branch: old?.branch ?? session.branch ?? null, cwd: old?.cwd ?? session.cwd ?? null, started_at: old?.started_at ?? session.startedAt ?? null,
        ended_at: session.endedAt ?? old?.ended_at ?? null, status: session.status, reason: session.reason ?? null,
        read_through: session.readThrough == null ? old?.read_through ?? null : String(session.readThrough), raw_key: old?.raw_key ?? null,
        raw_bytes: session.rawBytes ?? old?.raw_bytes ?? null, updated_at: now(), owner_subject: old ? old.owner_subject : subject, owner_email: caller.email ?? null,
      });
    }
    function target(id) {
      const old = facts.find(f => f.id === id && f.superseded_by === null && visible(f, true));
      if (!old) throw new StoreError(`fact #${id} is not live, or not one you may see`);
      if (!admin && (subject === null || old.owner_subject !== subject)) throw forbidden(`fact #${id} is someone else's; only they or the admin can restate it`);
      return old;
    }
    const insert = (row, tagNames) => {
      const fact = { ...row, id: facts.length + 1, superseded_by: null };
      facts.push(fact);
      factTags.set(fact.id, new Set(tagNames));
      return fact.id;
    };
    const ownRun = () => runs.filter(run => run.owner_subject === subject);

    return {
      role: caller.role,
      caller: async () => caller,
      facts: async queries => queries.map(read),

      async digest({ slug = null, stepTags = [], limit = 60 }) {
        const live = facts.filter(f => f.superseded_by === null && visible(f, false));
        const counts = new Map();
        for (const thread of live.filter(f => f.type === 'thread' && f.slug !== (slug || ''))) {
          const named = tagsOf(thread.id).filter(name => stepTags.includes(name));
          for (const tag of named.length ? named : [null]) counts.set(tag, (counts.get(tag) || 0) + 1);
        }
        const last = runs.filter(r => r.kind === 'consolidation' && r.status === 'ok' && r.owner_subject === subject).map(r => r.finished_at).sort().at(-1) ?? null;
        const run = ownRun().at(-1);
        return {
          facts: live.filter(f => f.type !== 'thread').sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || newest(a, b)).slice(0, Number(limit) || 60).map(f => asFact(f)),
          live: live.length,
          threads: live.filter(f => f.type === 'thread' && f.slug === (slug || '')).sort(newest).map(f => asFact(f)),
          steps: [...counts].map(([tag, n]) => ({ tag, n })),
          run: run ? { kind: run.kind, host: run.host, started_at: run.started_at, finished_at: run.finished_at, status: run.status, reason: run.reason, counts: run.counts } : null,
          consolidation: {
            last_consolidation: last,
            captured_since: [...sessions.values()].filter(s => s.status === 'captured' && s.updated_at > (last || '') && ownSession(s)).length,
            first_fact: facts.filter(f => visible(f, true)).map(f => f.created_at).sort()[0] ?? null,
          },
        };
      },

      // Every check runs before the first change, so a refused write changes nothing.
      async write({ session, source = 'save', slug, newTags = [], facts: asked = [], createdAt }) {
        if (!SOURCES.includes(source)) throw new StoreError(`source must be one of ${SOURCES.join(', ')}`);
        if (session) checkSession(session);
        const old = new Map(asked.filter(f => f.restate || f.close).map(f => [f, target(Number(f.restate || f.close))]));
        for (const fact of asked) {
          for (const named of fact.sources || []) if (named !== `session:${session?.id}`) throw forbidden('a fact\'s source may name only the session that writes it');
        }
        const time = now();
        if (session) putSession(session);
        for (const tag of newTags) if (!tags.has(tag.name)) tags.set(tag.name, { name: tag.name, definition: tag.definition, alias_of: tag.aliasOf ?? null });
        const ids = [], superseded = [];
        for (const fact of asked) {
          const was = old.get(fact);
          const id = fact.restate ? insert(was, [...tagsOf(was.id), ...(fact.tags || [])])
            : fact.close ? insert({ ...was, type: 'project', body: String(fact.body).trim(), session_id: null, created_at: time }, tagsOf(was.id))
              : insert({ slug: fact.slug || slug, type: fact.type, body: String(fact.body).trim(), session_id: session?.id ?? null,
                created_at: /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(String(createdAt)) && createdAt <= time ? createdAt : time,
                author: caller.email ?? null, owner_subject: subject, shared: caller.role === 'reader' ? 0 : 1 }, fact.tags || []);
          ids.push(id);
          const supersedes = was ? [was.id] : (fact.supersedes || []).map(Number).filter(Boolean);
          if (!supersedes.length) continue;
          const marked = facts.filter(f => supersedes.includes(f.id) && f.superseded_by === null && (admin || f.owner_subject === subject));
          for (const f of marked) f.superseded_by = id;
          superseded.push({ asked: supersedes, marked: marked.map(f => f.id) });
        }
        const unmarked = superseded.flatMap(({ asked: ids, marked }) => ids.filter(id => !marked.includes(id)));
        const left = facts.filter(f => unmarked.includes(f.id) && f.superseded_by === null && visible(f, true)).map(f => ({ id: f.id, author: f.author }));
        return { ids, superseded, left };
      },

      tags: async () => [...tags.values()].sort((a, b) => a.name.localeCompare(b.name))
        .map(tag => ({ ...tag, uses: facts.filter(f => visible(f, true) && factTags.get(f.id).has(tag.name)).length })),

      async defineTag({ name, definition, aliasOf = null }) {
        if (!admin) throw forbidden('only the admin can change a tag; a member may add facts, but not change them');
        tags.set(name, { name, definition, alias_of: aliasOf });
        return {};
      },

      session: async ({ id }) => { const row = sessions.get(String(id)); return row && ownSession(row) ? { ...row } : null; },
      putSession: async session => { checkSession(session); putSession(session); return {}; },

      async transcript({ factId }) {
        const fact = facts.find(f => f.id === Number(factId) && visible(f, true));
        if (!fact) return { fact: null };
        const row = sessions.get(fact.session_id), missing = why => ({ missing: why, session: fact.session_id });
        if (fact.session_id && !admin && (!row || row.owner_subject === null || row.owner_subject !== subject)) return missing('only its owner and the admin can read this transcript');
        return row?.raw_key ? objects.get(row.raw_key) : missing('no transcript was stored for this session');
      },

      async putTranscript({ sessionId, agent }, bytes) {
        const id = String(sessionId), row = sessions.get(id);
        if (!['claude', 'codex'].includes(agent) || !id.startsWith(`${agent}:`)) throw new StoreError('a transcript names its own claude or codex session');
        if (caller.role === 'team' || !row || row.owner_subject !== subject || row.status === 'private') throw forbidden('register an owned, nonprivate session before upload');
        if (bytes.byteLength > MAX_TRANSCRIPT_BYTES) throw new StoreError('a transcript over the limit is not kept', { kind: 'tooLarge' });
        const key = `sessions/${subject ?? 'unassigned'}/${id.replace(':', '/')}.jsonl`;
        objects.set(key, new Uint8Array(bytes));
        Object.assign(row, { raw_key: key, raw_bytes: bytes.byteLength, updated_at: now() });
        return { key };
      },

      async putRun({ kind, host, startedAt, status, reason, counts }) {
        runs.push({ kind, host: host ?? null, started_at: startedAt || now(), finished_at: now(), status, reason: reason ?? null,
          counts: typeof counts === 'string' ? counts : JSON.stringify(counts ?? {}), owner_subject: subject });
        return {};
      },

      async stats() {
        const seen = facts.filter(f => visible(f, true)), live = seen.filter(f => f.superseded_by === null);
        const own = [...sessions.values()].filter(ownSession);
        const types = [...new Set(live.map(f => f.type))].sort().map(type => ({ type, n: live.filter(f => f.type === type).length }));
        return { types, totals: { facts: seen.length, live: live.length, sessions: own.length, private: own.filter(s => s.status === 'private').length },
          consolidations: ownRun().filter(r => r.kind === 'consolidation' && r.status === 'ok').reverse().slice(0, 10).map(r => ({ counts: r.counts })) };
      },
    };
  }
  return { as };
}
