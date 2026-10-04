// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { routes } from "../../router";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    if (path === "/api/access/apps") return Response.json({ state: "current", role: "employee", revision: 1, apps: ["access", "tips"] });
    throw new Error(`Unexpected calculator request: ${path}`);
  }));
  const router = createMemoryRouter(routes, { initialEntries: ["/apps/tips/"] });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  await screen.findByRole("heading", { level: 1, name: "Tip calculator" });
});

const result = () => document.querySelector("output")!;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const pressed = () =>
  screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true").map((button) => button.textContent);

it("labels each field, starts at 15% for one person, and asks for the bill", () => {
  expect(screen.getByLabelText("Bill").getAttribute("inputmode")).toBe("decimal");
  expect((screen.getByLabelText("People") as HTMLInputElement).value).toBe("1");
  expect(screen.getByRole("group", { name: "Tip" })).toBeTruthy();
  expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["10%", "15%", "18%", "20%"]);
  expect(pressed()).toEqual(["15%"]);
  expect(result().textContent).toBe("Enter the bill amount.");
  expect(result().getAttribute("aria-live")).toBe("polite");
});

it("recalculates each share as you type and pick a tip", () => {
  type("Bill", "100");
  expect(screen.getByText("$115.00 each")).toBeTruthy();

  type("People", "4");
  fireEvent.click(screen.getByRole("button", { name: "20%" }));

  expect(pressed()).toEqual(["20%"]);
  expect(screen.getByText("$30.00 each")).toBeTruthy();
  expect(screen.getByText("Tip $20.00 · Total $120.00")).toBeTruthy();
});

it("says what to fix when an entry can not be split", () => {
  type("Bill", "100");
  type("People", "0");
  expect(result().textContent).toBe("At least one person pays.");

  type("People", "2");
  type("Bill", "-5");
  expect(result().textContent).toBe("Enter the bill amount.");

  type("Bill", "");
  expect(result().textContent).toBe("Enter the bill amount.");
});
