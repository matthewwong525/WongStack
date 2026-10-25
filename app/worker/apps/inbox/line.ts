// A person's live line: one Durable Object holding their computer's and open inbox's sockets. It only says *look
// now*; the routes carry what changed. It also keeps their schedule clock. wiki/stack/live-line.md
import { nextWake, tick } from "./schedule-store.ts";
import { seen } from "./rows.ts";

/** A socket's tag (`page` or `computer:<id>`), when its sign-in ends, its last look, and whether one waits. */
type Socket = { tag: string; exp: number; lastLook: number; pending: boolean };
type Who = { installation: string; email: string };

const LOOK = JSON.stringify({ t: "look" });
const BYE = JSON.stringify({ t: "bye" });
/** At most one look per socket per second: a burst of writes is one fetch, and the last look is never dropped. */
const LOOK_GAP_MS = 1000;

const said = (text: string): unknown => { try { return JSON.parse(text); } catch { return null; } };
const tagsOf = (computers: Set<string>) => new Set([...computers].map(id => `computer:${id}`));

export class Line {
  declare readonly __DURABLE_OBJECT_BRAND: never;
  private readonly ctx: DurableObjectState;
  private readonly env: Pick<Env, "DB">;

  constructor(ctx: DurableObjectState, env: Pick<Env, "DB">) {
    this.ctx = ctx;
    this.env = env;
    // A ping is answered without waking the object, so a quiet line costs nothing.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  /** Reached only through the app's binding: `/connect` from the line route, `/wake` from a route's write. */
  async fetch(request: Request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/connect") return this.connect(request);
    if (pathname !== "/wake") return new Response("Not found", { status: 404 });
    const { installation, email, computer } = await request.json<Who & { computer: string | null }>();
    await this.ctx.storage.put("who", { installation, email });
    this.lookWhere(tag => tag === "page" || computer === "*" || tag === `computer:${computer}`);
    await this.arm();
    return new Response(null, { status: 204 });
  }

  /** A hello from a computer: it is here, the clock ticks, and it hears look when a run waits for it. */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const { tag } = ws.deserializeAttachment() as Socket;
    if (!tag.startsWith("computer:") || typeof message !== "string" || (said(message) as { t?: unknown } | null)?.t !== "hello") return;
    const at = this.scope((await this.who())!);
    await seen(at);
    const due = tagsOf(await tick(at));
    if (due.has(tag)) this.send(ws);
    await this.arm();
  }

  /** Answers a goodbye, or the other side waits out its close timeout and sees the line drop. */
  webSocketClose(ws: WebSocket) {
    try { ws.close(1000, "bye"); } catch { /* already closed */ }
  }

  /** Closes sockets whose sign-in ended, sends the looks held back, starts runs that came due, and re-arms. */
  async alarm() {
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const socket = ws.deserializeAttachment() as Socket;
      if (socket.exp <= now) {
        try { ws.send(BYE); ws.close(4001, "expired"); } catch { /* already closing */ }
      } else if (socket.pending) this.send(ws, now);
    }
    const who = await this.who();
    if (who) {
      const due = tagsOf(await tick(this.scope(who)));
      if (due.size) this.lookWhere(tag => tag === "page" || due.has(tag));
    }
    await this.arm();
  }

  private async connect(request: Request) {
    const headers = request.headers;
    if (headers.get("upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    await this.ctx.storage.put("who", { installation: headers.get("x-line-installation")!, email: headers.get("x-line-email")! });
    const [client, server] = Object.values(new WebSocketPair());
    const tag = headers.get("x-line-tag")!;
    this.ctx.acceptWebSocket(server, [tag]);
    server.serializeAttachment({ tag, exp: Number(headers.get("x-line-exp")), lastLook: 0, pending: false } satisfies Socket);
    await this.arm();
    return new Response(null, { status: 101, webSocket: client });
  }

  private who() {
    return this.ctx.storage.get<Who>("who");
  }

  private scope({ installation, email }: Who) {
    return { db: this.env.DB.withSession("first-primary"), installation, email, now: Date.now() };
  }

  private lookWhere(wanted: (tag: string) => boolean) {
    for (const ws of this.ctx.getWebSockets()) if (wanted((ws.deserializeAttachment() as Socket).tag)) this.send(ws);
  }

  /** Says look now, or marks it to go when the socket's second is up. */
  private send(ws: WebSocket, now = Date.now()) {
    const socket = ws.deserializeAttachment() as Socket;
    socket.pending = now - socket.lastLook < LOOK_GAP_MS;
    if (!socket.pending) {
      try { ws.send(LOOK); } catch { /* closing: the next connect fetches anyway */ }
      socket.lastLook = now;
    }
    ws.serializeAttachment(socket);
  }

  /** The alarm goes at the soonest of: a socket's sign-in ending, a held look, the next schedule run. */
  private async arm() {
    const now = Date.now();
    const times = this.ctx.getWebSockets().map(ws => ws.deserializeAttachment() as Socket).filter(socket => socket.exp > now)
      .map(socket => socket.pending ? Math.min(socket.exp, socket.lastLook + LOOK_GAP_MS) : socket.exp);
    const who = await this.who();
    const next = who ? await nextWake(this.scope(who)) : null;
    if (next !== null) times.push(next);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }
}
