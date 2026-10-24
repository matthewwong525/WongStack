import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { database } from "../../../tests/employee-access/connections";
import { Line } from "./line";

const START = Date.UTC(2026, 9, 22, 9, 0);
const EXP = START + 3_600_000;
const DESK = "1".repeat(32);
const LAPTOP = "2".repeat(32);
const LOOK = '{"t":"look"}';

/** A hibernating socket as the runtime keeps it: what it was sent, how it closed, and its attachment. */
class Socket {
  sent: string[] = [];
  closed: [number, string] | null = null;
  broken = false;
  attachment: unknown = null;
  send(message: string) {
    if (this.broken) throw new Error("closed");
    this.sent.push(message);
  }
  close(code: number, reason: string) {
    if (this.broken) throw new Error("closed");
    this.closed = [code, reason];
  }
  serializeAttachment(value: unknown) { this.attachment = structuredClone(value); }
  deserializeAttachment() { return structuredClone(this.attachment); }
}

// Node can't build a 101 answer or a socket pair; these stand in for the runtime's.
class Upgrade extends Response {
  constructor(text: BodyInit | null, init: ResponseInit = {}) {
    super(text, init.status === 101 ? { ...init, status: 200 } : init);
    if (init.status === 101) Object.defineProperty(this, "status", { value: 101 });
    Object.defineProperty(this, "webSocket", { value: init.webSocket });
  }
}
let pair: Socket[];
let db: ReturnType<typeof database>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  vi.stubGlobal("Response", Upgrade);
  vi.stubGlobal("WebSocketPair", function () { pair = [new Socket(), new Socket()]; return { 0: pair[0], 1: pair[1] }; });
  vi.stubGlobal("WebSocketRequestResponsePair", class { request: string; response: string;
    constructor(request: string, response: string) { this.request = request; this.response = response; } });
  db = database();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function line() {
  const accepted: Socket[] = [];
  const kept = new Map<string, unknown>();
  let auto: unknown = null;
  const state = { alarm: null as number | null };
  const ctx = {
    setWebSocketAutoResponse: (value: unknown) => { auto = value; },
    acceptWebSocket: (socket: Socket) => { accepted.push(socket); },
    getWebSockets: () => accepted.filter(socket => !socket.closed),
    storage: {
      get: async (key: string) => kept.get(key),
      put: async (key: string, value: unknown) => { kept.set(key, value); },
      setAlarm: async (at: number) => { state.alarm = at; },
      deleteAlarm: async () => { state.alarm = null; },
    },
  };
  const object = new Line(ctx as unknown as DurableObjectState, { DB: db.DB });
  const connect = async (tag: string, exp = EXP) => {
    const answer = await object.fetch(new Request("https://line/connect", { headers: { upgrade: "websocket", "x-line-tag": tag,
      "x-line-exp": String(exp), "x-line-installation": "", "x-line-email": "sam@example.com" } }));
    expect(answer.status).toBe(101);
    expect(answer.webSocket).toBe(pair[0]);
    return pair[1];
  };
  const wake = (computer: string | null) => object.fetch(new Request("https://line/wake", { method: "POST",
    body: JSON.stringify({ installation: "", email: "sam@example.com", computer }) }));
  return { object, connect, wake, state, kept, auto: () => auto };
}
const later = (ms: number) => vi.setSystemTime(Date.now() + ms);
const looks = (socket: Socket) => socket.sent.filter(message => message === LOOK).length;
const putSchedule = (computer: string, nextRunAt: number | null, state = "on", host = "app") => db.sql.prepare(`INSERT INTO schedules
  VALUES ('', 'sam@example.com', ?, ?, ?, 'Digest', '', '{"mode":"recurring","every":"1h","timezone":"UTC","allowedLatenessMs":600000}',
  '', ?, ?, NULL, 0)`).run(`digest-${computer.slice(0, 4)}-${host}-${state}`, host, computer, state, nextRunAt);

it("answers pings itself, so a quiet line never wakes", () => {
  expect(line().auto()).toEqual({ request: '{"t":"ping"}', response: '{"t":"pong"}' });
});

it("holds a page's and a computer's sockets, remembers whose line it is, and closes each when its sign-in ends", async () => {
  const sam = line();
  const page = await sam.connect("page");
  const desk = await sam.connect(`computer:${DESK}`, EXP + 60_000);
  expect(sam.kept.get("who")).toEqual({ installation: "", email: "sam@example.com" });
  expect(sam.state.alarm).toBe(EXP);
  expect(page.attachment).toEqual({ tag: "page", exp: EXP, lastLook: 0, pending: false });

  vi.setSystemTime(EXP);
  await sam.object.alarm();
  expect(page.sent).toEqual(['{"t":"bye"}']);
  expect(page.closed).toEqual([4001, "expired"]);
  expect(desk.closed).toBeNull();
  expect(sam.state.alarm).toBe(EXP + 60_000);
  desk.broken = true;
  vi.setSystemTime(EXP + 60_000);
  await sam.object.alarm();
  expect(sam.state.alarm).toBeNull();
});

it("refuses anything but a socket, and any other address", async () => {
  const { object } = line();
  expect((await object.fetch(new Request("https://line/connect"))).status).toBe(426);
  expect((await object.fetch(new Request("https://line/other"))).status).toBe(404);
});

it("says look to the pages and the computer a wake names, at most once a second, sending a held look when the second ends", async () => {
  const sam = line();
  const page = await sam.connect("page");
  const desk = await sam.connect(`computer:${DESK}`);
  const laptop = await sam.connect(`computer:${LAPTOP}`);
  expect((await sam.wake("*")).status).toBe(204);
  expect([page, desk, laptop].map(looks)).toEqual([1, 1, 1]);

  later(1000);
  await sam.wake(DESK);
  expect([page, desk, laptop].map(looks)).toEqual([2, 2, 1]);
  later(1000);
  await sam.wake(null);
  expect([page, desk, laptop].map(looks)).toEqual([3, 2, 1]);

  // A second write inside the second is held, then sent once, never dropped.
  later(400);
  await sam.wake(null);
  await sam.wake(null);
  expect(looks(page)).toBe(3);
  expect(sam.state.alarm).toBe(START + 3000);
  later(600);
  await sam.object.alarm();
  expect(looks(page)).toBe(4);
  expect(sam.state.alarm).toBe(EXP);

  // An alarm early for a held look keeps holding it.
  later(100);
  await sam.wake(null);
  await sam.object.alarm();
  expect(looks(page)).toBe(4);
  expect(sam.state.alarm).toBe(START + 4000);
});

it("never fails on a socket that is closing", async () => {
  const sam = line();
  const page = await sam.connect("page");
  page.broken = true;
  expect((await sam.wake(null)).status).toBe(204);
  expect(page.attachment).toMatchObject({ lastLook: START });
});

it("answers a goodbye at once, even from a socket already gone", async () => {
  const sam = line();
  const desk = await sam.connect("computer:desk");
  sam.object.webSocketClose(desk as unknown as WebSocket);
  expect(desk.closed).toEqual([1000, "bye"]);
  const page = await sam.connect("page");
  page.broken = true;
  expect(() => sam.object.webSocketClose(page as unknown as WebSocket)).not.toThrow();
});

it("takes a computer's hello as a check-in, and says look when a run waits for it", async () => {
  const sam = line();
  const page = await sam.connect("page");
  const desk = await sam.connect(`computer:${DESK}`);
  const seen = () => db.sql.prepare("SELECT last_checkin_at AS at FROM inbox_seen").get();

  for (const ignored of ['{"t":"look"}', "null", "not json", new ArrayBuffer(2)]) await sam.object.webSocketMessage(desk as unknown as WebSocket, ignored);
  await sam.object.webSocketMessage(page as unknown as WebSocket, '{"t":"hello"}');
  expect(seen()).toBeUndefined();

  await sam.object.webSocketMessage(desk as unknown as WebSocket, `{"t":"hello","computer":"${DESK}","protocol":8}`);
  expect(seen()).toEqual({ at: START });
  expect(looks(desk)).toBe(0);

  putSchedule(DESK, START);
  later(30_000);
  await sam.object.webSocketMessage(desk as unknown as WebSocket, `{"t":"hello","computer":"${DESK}","protocol":8}`);
  expect(seen()).toEqual({ at: START + 30_000 });
  expect(looks(desk)).toBe(1);
  expect(looks(page)).toBe(0);
  expect(db.sql.prepare("SELECT key, due_at, state FROM schedule_runs").all()).toEqual([{ key: "digest-1111-app-on", due_at: START, state: "due" }]);
  expect(sam.state.alarm).toBe(START + 3_600_000);
});

it("starts the runs that came due on its alarm, saying look to the pages and their computer, and arms for the next", async () => {
  const sam = line();
  const page = await sam.connect("page", EXP + 7_200_000);
  const desk = await sam.connect(`computer:${DESK}`, EXP + 7_200_000);
  const laptop = await sam.connect(`computer:${LAPTOP}`, EXP + 7_200_000);
  putSchedule(DESK, START + 60_000);
  putSchedule(LAPTOP, START + 30_000, "paused");
  putSchedule(LAPTOP, START + 30_000, "on", "paseo");
  await sam.wake(DESK);
  expect(sam.state.alarm).toBe(START + 60_000);

  vi.setSystemTime(START + 60_000);
  await sam.object.alarm();
  expect([page, desk, laptop].map(looks)).toEqual([2, 2, 0]);
  expect(sam.state.alarm).toBe(START + 3_600_000);

  // Nothing came due: nobody hears look.
  later(1000);
  db.sql.exec("UPDATE schedule_runs SET state = 'taken', claimed_at = 0");
  await sam.object.alarm();
  expect([page, desk, laptop].map(looks)).toEqual([2, 2, 0]);
});

it("arms for nothing on a line no one has opened", async () => {
  const sam = line();
  await sam.object.alarm();
  expect(sam.state.alarm).toBeNull();
});
