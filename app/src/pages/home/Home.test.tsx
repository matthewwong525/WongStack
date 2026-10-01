// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { apps } from "../../lib/apps";
import { Home } from "./Home";

afterEach(cleanup);

it("lists every app in this build at once, with no loading step", () => {
  render(<Home />);

  expect(screen.queryAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(apps.map((app) => app.href));
  expect(screen.queryByText(/Loading/)).toBeNull();
});

it("keeps the workspace heading and apps outside the removable welcome, in order", () => {
  render(<Home />);

  const heading = screen.getByRole("heading", { level: 1, name: "Your workspace, shaped around you" });
  const tutorial = screen.getByRole("region", { name: "Make it yours" });
  const appHeading = screen.getByRole("heading", { level: 2, name: "Your apps" });
  const list = appHeading.nextElementSibling!;
  expect(screen.getByText("Your tools, in one place.")).toBeTruthy();
  expect(heading.compareDocumentPosition(tutorial)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(tutorial.compareDocumentPosition(appHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(tutorial.contains(heading)).toBe(false);
  expect(tutorial.contains(appHeading)).toBe(false);
  expect(tutorial.contains(list)).toBe(false);
  expect(list.className).toMatch(/^app-list/);
});
