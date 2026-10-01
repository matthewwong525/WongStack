// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Tutorial } from "./Tutorial";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const message =
  "Get to know me and make this home page mine. First ask if you may skim my Claude Code and Codex chats from the last 30 days on this computer. Then ask me two or three short rounds of questions about what you couldn't find. Save short notes about me on my wiki page and in your memory, never passwords, keys, or copies of my chats. Then ask what to call this page, update its heading, remove this welcome guide, explain each step, and show me a preview before publishing.";

const press = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button"));
  });
  return screen.getByRole("button");
};

it("offers one first request and explains the preview and existing chat", () => {
  render(<Tutorial />);

  const tutorial = screen.getByRole("region", { name: "Make it yours" });
  expect(screen.getByRole("heading", { level: 2, name: "Make it yours" })).toBeTruthy();
  expect(screen.getByText(/Want something different/).textContent).toBe(
    "Want something different? Just ask in your chat. You’ll see a preview before anything goes live.",
  );
  expect(tutorial.querySelector("blockquote")?.textContent).toBe(message);
  expect(tutorial.querySelectorAll("blockquote")).toHaveLength(1);
  expect(screen.getByText("Paste it into your chat to start.")).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();

  const button = screen.getByRole("button");
  expect(button.textContent).toBe("Copy your first request");
  expect(button.getAttribute("type")).toBe("button");
  expect(button.getAttribute("aria-live")).toBe("polite");
});

it("copies the message and says so", async () => {
  const writeText = vi.fn(async () => {});
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<Tutorial />);

  expect((await press()).textContent).toBe("Copied");
  expect(writeText).toHaveBeenCalledWith(message);
  expect(screen.getByText("Paste it into your chat to start.")).toBeTruthy();
});

it("asks for a copy by hand when the browser refuses", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: async () => Promise.reject(new Error("denied")) } });
  render(<Tutorial />);

  expect((await press()).textContent).toBe("Select the message and copy it");
  expect(screen.getByText(message).tagName).toBe("BLOCKQUOTE");
});

it("asks for a copy by hand when the browser has no clipboard", async () => {
  vi.stubGlobal("navigator", {});
  render(<Tutorial />);

  expect((await press()).textContent).toBe("Select the message and copy it");
  expect(screen.getByText(message).tagName).toBe("BLOCKQUOTE");
});
