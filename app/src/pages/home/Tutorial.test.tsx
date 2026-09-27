// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Tutorial } from "./Tutorial";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const message =
  "Remove the tutorial from my home page. Walk me through each step and explain what it does.";

const press = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button"));
  });
  return screen.getByRole("button");
};

it("shows one message to paste, with a Copy button and no step list", () => {
  render(<Tutorial />);

  const tutorial = screen.getByRole("region", { name: "Learn the development loop" });
  expect(tutorial.querySelector("p")?.textContent).toBe(
    "Your first change removes this box. Copy this message into your chat with the agent:",
  );
  expect(tutorial.querySelector("blockquote")?.textContent).toBe(message);
  expect(screen.queryByRole("list")).toBeNull();

  const button = screen.getByRole("button");
  expect(button.textContent).toBe("Copy");
  expect(button.getAttribute("type")).toBe("button");
  expect(button.getAttribute("aria-live")).toBe("polite");
});

it("copies the message and says so", async () => {
  const writeText = vi.fn(async () => {});
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<Tutorial />);

  expect((await press()).textContent).toBe("Copied");
  expect(writeText).toHaveBeenCalledWith(message);
});

it("asks for a copy by hand when the browser refuses", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: async () => Promise.reject(new Error("denied")) } });
  render(<Tutorial />);

  expect((await press()).textContent).toBe("Select the message and copy it");
});

it("asks for a copy by hand when the browser has no clipboard", async () => {
  vi.stubGlobal("navigator", {});
  render(<Tutorial />);

  expect((await press()).textContent).toBe("Select the message and copy it");
});
