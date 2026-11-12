// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VIEWS } from "./address.mjs";
import { Pushers } from "./pushers.mjs";
import { cleanup, fireEvent, renderPart, screen, waitFor, within } from "./test-dom.mjs";
import { html } from "./vendor/preact-htm.mjs";

const kim = { githubId: 7, login: "kimlee", email: "kim@example.com", emailSource: "commit", canOpenPreviews: true };
const jo = { githubId: 9, login: "jo-builds", email: null, emailSource: null, canOpenPreviews: false };
let answer;
let fetchMock;
beforeEach(() => {
  answer = { state: "listed", split: true, pushers: [kim, jo] };
  fetchMock = vi.fn(async (_url, init) => {
    if (init?.method !== "PUT") return Response.json(answer);
    const { email } = JSON.parse(String(init.body));
    if (email === "bad@x") return Response.json({ code: "invalid_email" }, { status: 400 });
    answer = { ...answer, pushers: [kim, { ...jo, email, emailSource: "owner", canOpenPreviews: true }] };
    return Response.json(answer);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = () => renderPart(html`<${Pushers} view=${VIEWS[0]} />`);
const section = () => screen.findByRole("region", { name: "Can push on GitHub" });

it("lists each pusher with their email and whether they can open previews", async () => {
  await show();
  const list = await section();
  expect(within(list).getByText("2")).toBeTruthy();
  expect(within(list).getByText("They can open previews, not the live app.")).toBeTruthy();
  const rows = within(within(list).getByRole("table", { name: "Can push on GitHub" })).getAllByRole("row").slice(1);
  expect(rows.map(row => row.textContent)).toEqual(["@kimleekim@example.comCan open previews", "@jo-buildsNeeds an emailSave"]);
});

it("saves a typed email, and the row then says it can open previews", async () => {
  await show();
  await section();
  await fireEvent.change(screen.getByRole("textbox", { name: "Email for @jo-builds" }), { target: { value: "jo@example.com" } });
  await fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.getAllByText("Can open previews")).toHaveLength(2));
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
  expect([put[0], JSON.parse(put[1].body), put[1].headers.Origin]).toEqual(["/api/access/pushers/9", { email: "jo@example.com" }, window.location.origin]);
  expect(screen.queryByText("Needs an email")).toBeNull();
});

it("says when a save failed, and keeps the field", async () => {
  await show();
  await section();
  await fireEvent.change(screen.getByRole("textbox", { name: "Email for @jo-builds" }), { target: { value: "bad@x" } });
  await fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect((await screen.findByRole("alert")).textContent).toBe("That did not save. Try again.");
  expect(screen.getByRole("textbox", { name: "Email for @jo-builds" })).toBeTruthy();
});

it("shows one line for each state that lists nobody, and hides a project kept elsewhere or a failed read", async () => {
  const lines = [["no_github", "No GitHub key. Once the app holds the project's GitHub key, people who can push are listed here."],
    ["live_only", "Live app only. The live app reads who can push on GitHub."],
    ["not_started", "Finish Access setup. Then people who can push on GitHub can open previews."]];
  for (const [state, line] of lines) {
    answer = { state, pushers: [] };
    await show();
    await section();
    expect(screen.getByText(`${line.split(". ")[0]}.`).parentElement.textContent).toBe(line);
    expect(screen.queryByRole("table")).toBeNull(); cleanup();
  }
  answer = { state: "not_github", pushers: [] };
  let container = await show();
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(container.textContent).toBe(""); cleanup();
  // A project with no such list answers nothing readable: the section stays hidden.
  fetchMock.mockImplementation(async () => Response.json({}, { status: 404 }));
  const before = fetchMock.mock.calls.length;
  container = await show();
  await waitFor(() => expect(fetchMock.mock.calls.length).toBe(before + 1));
  expect(container.textContent).toBe("");
});

it("keeps the last list with a note when GitHub could not be reached, and says when previews still share the sign-in", async () => {
  answer = { state: "unavailable", split: false, pushers: [{ ...kim, canOpenPreviews: false }] };
  await show();
  const list = await section();
  expect(within(list).getByText("Couldn't reach GitHub. This is the last list.")).toBeTruthy();
  expect(within(list).getByText("Finish Access setup", { selector: "[data-slot='badge']" })).toBeTruthy();
  expect(within(list).getByText(/Previews share the live app's sign-in until then\./)).toBeTruthy();
});

it("stacks a row into lines on a phone width, naming each line", async () => {
  await show();
  const list = await section();
  const table = within(list).getByRole("table");
  expect(table.className).toContain("@max-[44rem]:block");
  const [, email, signIn] = within(table).getAllByRole("row")[1].querySelectorAll("td");
  expect([email.dataset.label, signIn.dataset.label]).toEqual(["Email", "Sign-in"]);
  expect(email.className).toContain("@max-[44rem]:not-first:col-span-full");
});
