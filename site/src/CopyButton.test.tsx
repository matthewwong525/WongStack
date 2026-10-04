// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./CopyButton";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Renders a copy button over a clipboard that copies or refuses, and clicks it. */
async function click(copies: boolean, iconOnly = false) {
  const writeText = vi.fn(async () => (copies ? undefined : Promise.reject(new Error("denied"))));
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const onResult = vi.fn();
  render(<CopyButton text="the text" label="Copy it" iconOnly={iconOnly} onResult={onResult} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy it" })));
  expect(writeText).toHaveBeenCalledExactlyOnceWith("the text");
  return onResult;
}

describe("CopyButton", () => {
  it("copies its text, then shows Copied and reports it", async () => {
    const onResult = await click(true);
    expect(onResult).toHaveBeenCalledExactlyOnceWith("copied");
    const button = screen.getByRole("button", { name: "Copied" });
    expect(button.getAttribute("data-copy")).toBe("label");
    expect(button.getAttribute("data-copied")).toBe("true");
    expect(button.querySelectorAll("svg[aria-hidden]")).toHaveLength(1);
  });

  it("reports a refused copy and keeps its label", async () => {
    const onResult = await click(false);
    expect(onResult).toHaveBeenCalledExactlyOnceWith("refused");
    expect(screen.getByRole("button", { name: "Copy it" }).textContent).toBe("Copy it");
    expect(screen.getByRole("button", { name: "Copy it" }).hasAttribute("data-copied")).toBe(false);
  });

  it("shows only the icon, named by its label, until it copies", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CopyButton text="t" label="Copy it" iconOnly onResult={() => {}} />);
    const button = screen.getByRole("button", { name: "Copy it" });
    expect(button.textContent).toBe("");
    expect(button.getAttribute("title")).toBe("Copy it");
    expect(button.getAttribute("data-copy")).toBe("icon");
    await act(async () => fireEvent.click(button));
    expect(screen.getByRole("button", { name: "Copied" }).textContent).toBe("Copied");
  });

  it("keeps an icon-only button's name when the copy is refused", async () => {
    await click(false, true);
    expect(screen.getByRole("button", { name: "Copy it" }).textContent).toBe("");
  });
});
