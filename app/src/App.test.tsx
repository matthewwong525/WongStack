// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("renders the scaffold and handles both buttons", async () => {
  const json = vi.fn(async () => ({ name: "Ada" }));
  const fetchMock = vi.fn(async () => ({ json }));
  vi.stubGlobal("fetch", fetchMock);

  render(<App />);

  const counter = screen.getByRole("button", { name: "Count is 0" });
  expect(screen.getByRole("button", { name: "get name" }).textContent).toBe(
    "Name from API is: unknown",
  );
  const buttonList = counter.closest("ul");
  expect(buttonList?.style.display).toBe("flex");
  expect(buttonList?.style.gap).toBe("1rem");
  expect(buttonList?.style.listStyle).toBe("none");
  expect(buttonList?.style.padding).toBe("0px");

  fireEvent.click(counter);
  expect(counter.textContent).toBe("Count is 1");

  fireEvent.click(screen.getByRole("button", { name: "get name" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "get name" }).textContent).toBe(
      "Name from API is: Ada",
    );
  });
  expect(fetchMock).toHaveBeenCalledWith("/api/");
  expect(json).toHaveBeenCalledOnce();
});
