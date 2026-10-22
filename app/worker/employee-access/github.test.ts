import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GithubError, defaultBranch, github, githubFetch, githubUser } from "./github";

const TOKEN = "github_pat_synthetic_wide_value";
const source = { github: "acme/recipe-box", token: TOKEN };
let fetched: ReturnType<typeof vi.fn>;
beforeEach(() => { fetched = vi.fn(async () => Response.json({ default_branch: "trunk" })); vi.stubGlobal("fetch", fetched); });
afterEach(() => vi.unstubAllGlobals());

it("calls only under the repository's own address, with the key, and never follows a redirect", async () => {
  await githubFetch(source, "/pulls?state=all");
  await githubFetch(source, "/pulls", "POST", { title: "A change" });
  const [[read, got], [written, posted]] = fetched.mock.calls as [string, RequestInit & { headers: Record<string, string> }][];
  expect([read, got.method, got.redirect, got.body]).toEqual(["https://api.github.com/repos/acme/recipe-box/pulls?state=all", "GET", "manual", undefined]);
  expect(got.headers).toEqual({ Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "WongStack-project-code" });
  expect([written, posted.method, posted.body, posted.headers["Content-Type"]]).toEqual(["https://api.github.com/repos/acme/recipe-box/pulls", "POST", '{"title":"A change"}', "application/json"]);
});

it("reads a JSON answer, and throws GitHub's status with none of its words for anything else", async () => {
  expect(await github(source, "")).toEqual({ default_branch: "trunk" });
  const failed = async (answer: Response) => { fetched.mockImplementationOnce(async () => answer); return github(source, "/x", "PATCH", {}).catch((error: unknown) => error); };
  for (const [answer, status] of [[new Response(`secret ${TOKEN}`, { status: 404 }), 404], [new Response(null, { status: 302, headers: { Location: "https://elsewhere.example.com/" } }), 302],
    [new Response(null, { status: 500 }), 500], [new Response(null), 200], [new Response("x".repeat(4_194_305)), 502]] as const) {
    const error = await failed(answer);
    expect(error).toBeInstanceOf(GithubError);
    expect([(error as GithubError).status, (error as GithubError).message]).toEqual([status, "github"]);
  }
  expect(await failed(new Response("not json"))).toBeInstanceOf(SyntaxError);
});

it("asks GitHub once which branch the project publishes from, and again only after a failure", async () => {
  fetched.mockImplementationOnce(async () => Response.json({ default_branch: "" }));
  await expect(defaultBranch(source)).rejects.toThrow();
  expect([await defaultBranch(source), await defaultBranch(source)]).toEqual(["trunk", "trunk"]);
  expect(fetched).toHaveBeenCalledTimes(2);
  expect(fetched.mock.calls[1][0]).toBe("https://api.github.com/repos/acme/recipe-box");
});

it("reads one account's profile with the same key, headers and limits, and refuses a redirect", async () => {
  fetched.mockImplementationOnce(async () => Response.json({ email: "kim@example.com" }));
  expect(await githubUser(TOKEN, "kim-lee")).toEqual({ email: "kim@example.com" });
  const [[url, init]] = fetched.mock.calls as [string, RequestInit & { headers: Record<string, string> }][];
  expect([url, init.method, init.redirect]).toEqual(["https://api.github.com/users/kim-lee", "GET", "manual"]);
  expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "WongStack-project-code" });
  expect(init.signal).toBeInstanceOf(AbortSignal);
  for (const [response, status] of [[new Response(null, { status: 302, headers: { Location: "https://elsewhere.example.com/" } }), 302], [new Response("x".repeat(4_194_305)), 502]] as const) {
    fetched.mockImplementationOnce(async () => response);
    await expect(githubUser(TOKEN, "kim-lee")).rejects.toMatchObject({ status, message: "github" });
  }
});
