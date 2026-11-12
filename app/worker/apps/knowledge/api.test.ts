import { expect, it } from "vitest";
import type { AccessIdentity } from "../../access-slots";
import { handleApp } from "../index";
import { body, type Loose } from "../../../tests/body";
import { employee, fixture, owner } from "../../../tests/employee-access/connections";
import { fakeEnv } from "../../../tests/env";
import { fakeKnowledge, PAGES } from "../../../tests/knowledge";

const call = async (env: object, route: string, who: AccessIdentity | null = owner) => {
  const response = await handleApp(new Request(`https://business.example.com/apps/knowledge/api/${route}`), fakeEnv(env), who);
  return { status: response.status, type: response.headers.get("content-type"), json: (response.headers.get("content-type")?.includes("json") ? await body(response) : null) as Loose, response };
};

it("lists the pages at the newest save, titled by file name until a search has read them", async () => {
  const { env, state } = fakeKnowledge(PAGES);
  const before = await call(env, "pages");
  expect(before.json).toEqual({ commit: state.hash, capped: false, pages: [
    { path: "README.md", title: "README" }, { path: "how-we-work/refunds.md", title: "refunds" }, { path: "people/README.md", title: "people" },
    { path: "people/sam-lee.md", title: "sam-lee" }, { path: "welcome.md", title: "welcome" }] });
  expect((await call(env, "search?q=warehouse")).json).toEqual({ commit: state.hash, capped: false,
    hits: [{ path: "people/sam-lee.md", title: "Sam Lee", line: "Runs shipping and the warehouse." }] });
  expect((await call(env, "pages")).json.pages.map(page => page.title)).toEqual(["Company knowledge", "Refunds", "People", "Sam Lee", "Welcome"]);
});

it("lists file names while a search is still reading the pages, and when that read fails", async () => {
  const { env, repo } = fakeKnowledge(PAGES);
  const read = repo.readFile;
  let fail = (_error: Error) => {};
  const stalled = new Promise<never>((_resolve, reject) => { fail = reject; });
  repo.readFile = async (args) => args.path.endsWith(".md") ? stalled : read(args);
  const searching = call(env, "search?q=warehouse");
  const names = ["README", "refunds", "people", "sam-lee", "welcome"];
  const listed = await call(env, "pages");
  expect([listed.status, listed.json.pages.map(page => page.title)]).toEqual([200, names]);
  fail(new Error("read failed"));
  expect((await searching).status).toBe(500);
  const after = await call(env, "pages");
  expect([after.status, after.json.pages.map(page => page.title)]).toEqual([200, names]);
});

it("shows a page, and the edit a new save makes at the next read, with no other change", async () => {
  const repo = fakeKnowledge(PAGES);
  const first = await call(repo.env, "page?path=people/sam-lee");
  expect(first.json).toEqual({ commit: repo.state.hash, path: "people/sam-lee.md", title: "Sam Lee", public: false,
    html: '<h1 id="sam-lee">Sam Lee</h1>\n<p>Runs shipping and the warehouse.</p>\n', markdown: PAGES["people/sam-lee.md"],
    saved: "2026-11-04T03:00:38.000Z" });
  repo.save({ ...PAGES, "people/sam-lee.md": "# Sam Lee\n\nRuns shipping, the warehouse and returns.\n" });
  expect((await call(repo.env, "page?path=people/sam-lee")).json.html).toContain("returns");
  expect((await call(repo.env, "search?q=returns")).json.hits).toHaveLength(1);
  expect((await call(repo.env, "page?path=welcome")).json.public).toBe(true);
});

it("says a page is not there, and refuses a path that climbs out", async () => {
  const { env } = fakeKnowledge(PAGES);
  for (const path of ["nobody", "../secrets", ".git/config"]) {
    const missing = await call(env, `page?path=${encodeURIComponent(path)}`);
    expect([missing.status, missing.json.error.code], path).toEqual([404, "not_found"]);
  }
  expect((await call(env, "page")).status).toBe(400);
  expect((await call(env, "search?q=a")).status).toBe(400);
});

it("says knowledge is not set up on a preview or with no knowledge repository", async () => {
  const { env } = fakeKnowledge(PAGES);
  for (const bindings of [{ ...env, WONG_ENVIRONMENT: "staging" }, {}]) {
    for (const route of ["pages", "page?path=welcome", "search?q=welcome"]) {
      const answer = await call(bindings, route);
      expect([answer.status, answer.json.error.code], route).toEqual([503, "not_set_up"]);
    }
    expect((await call(bindings, "file?path=shop.png")).status).toBe(404);
  }
});

it("serves a page's picture, and nothing else: not an SVG, not a page, not a missing or unsafe path", async () => {
  const { env } = fakeKnowledge({ ...PAGES, "fake.png": new Blob(["<svg/>"], { type: "image/svg+xml" }) });
  const picture = await call(env, "file?path=how-we-work/chart.png");
  expect([picture.status, picture.type, await picture.response.text()]).toEqual([200, "image/png", "png bytes"]);
  expect(picture.response.headers.get("x-content-type-options")).toBe("nosniff");
  for (const path of ["how-we-work/logo.svg", "fake.png", "welcome.md", "gone.png", "../shop.png", ""]) {
    expect((await call(env, `file?path=${encodeURIComponent(path)}`)).status, path).toBe(404);
  }
  expect((await call(env, "file")).status).toBe(404);
});

it("refuses every route to a person without the Knowledge app", async () => {
  const { env } = fixture();
  const both = { ...env, ...fakeKnowledge(PAGES).env };
  for (const route of ["pages", "page?path=welcome", "search?q=welcome", "file?path=shop.png"]) {
    const refused = await call(both, route, employee);
    expect([refused.status, JSON.stringify(refused.json)], route).toEqual([403, expect.not.stringContaining("Welcome")]);
    expect((await call(both, route, owner)).status, route).toBe(200);
  }
});
