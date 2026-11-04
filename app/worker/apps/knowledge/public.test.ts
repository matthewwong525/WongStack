import { expect, it } from "vitest";
import { knowledgeReader } from "../../employee-access/knowledge-reader";
import { fakeKnowledge, PAGES } from "../../../tests/knowledge";
import { publicKnowledge } from "./public";

const open = async (env: object, path: string, method = "GET") => {
  const response = await publicKnowledge(new Request(`https://business.example.com${path}`, { method }), knowledgeReader(env));
  return { status: response.status, headers: Object.fromEntries(response.headers), text: await response.text() };
};

it("opens a page marked public, as a page of its own that loads nothing and runs nothing", async () => {
  const { env } = fakeKnowledge(PAGES);
  const page = await open(env, "/public/welcome");
  expect(page.status).toBe(200);
  expect(page.headers).toMatchObject({ "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" });
  expect(page.text).toContain("<title>Welcome</title>");
  expect(page.text).toContain('<a href="/public/how-we-work/refunds">refunds</a>');
  // A picture shows as its alt text, and nothing in the page loads from elsewhere.
  expect(page.text).toContain("<p>Our shop</p>");
  expect(page.text).not.toMatch(/<script|<img|<link|src=/);
  expect((await open(env, "/public/welcome/")).status).toBe(200);
});

it("gives a private, missing or folder page, any other file, and any other method the one same not-found", async () => {
  const { env } = fakeKnowledge(PAGES);
  const notFound = await open(env, "/public/nobody");
  expect(notFound.status).toBe(404);
  expect(notFound.text).toContain("Page not found");
  for (const path of ["/public/how-we-work/refunds", "/public/people", "/public/README", "/public/", "/public/shop.png",
    "/public/how-we-work", "/public/../welcome", "/public/%2e%2e/x", "/public/%E0%A4%A", "/public/.github/notes"]) {
    expect(await open(env, path), path).toEqual(notFound);
  }
  expect(await open(env, "/public/welcome", "POST")).toEqual(notFound);
  expect(await open({ ...env, WONG_ENVIRONMENT: "staging" }, "/public/welcome")).toEqual(notFound);
  expect(await open({}, "/public/welcome")).toEqual(notFound);
});
