// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AppList } from "./AppList";

afterEach(cleanup);

it("shows each app as an accessible link and labels only Hello as an example", () => {
  render(
    <AppList
      apps={[
        { name: "hello", title: "Hello", description: "A small example you can try and change.", href: "/apps/hello/" },
        { name: "tips", title: "Tips", description: "Split a bill with a tip", href: "/apps/tips/" },
      ]}
    />,
  );

  const links = screen.getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual(["/apps/hello/", "/apps/tips/"]);
  const hello = screen.getByRole("link", { name: "Hello Example A small example you can try and change." });
  const tips = screen.getByRole("link", { name: "Tips Split a bill with a tip" });
  expect(within(hello).getByText("Example")).toBeTruthy();
  expect(within(tips).queryByText("Example")).toBeNull();
  expect(screen.getAllByText("Example")).toHaveLength(1);
});

it("says how to ask for an app when there are none", () => {
  render(<AppList apps={[]} />);

  expect(screen.getByText("Your next tool starts with a request.")).toBeTruthy();
  expect(screen.getByText("Make me a tip calculator.").tagName).toBe("Q");
  expect(screen.getByText(/Ask in your chat:/)).toBeTruthy();
  expect(screen.queryAllByRole("link")).toEqual([]);
});

it("keeps a long app title and description together in its link", () => {
  const title = "A workspace tool with a very long title for the whole team";
  const description = "Review the next steps and notes from everyone working on the project together.";
  render(<AppList apps={[{ name: "team", title, description, href: "/apps/team/" }]} />);

  const link = screen.getByRole("link", { name: `${title} ${description}` });
  expect(link.getAttribute("href")).toBe("/apps/team/");
  expect(within(link).getByText(title)).toBeTruthy();
  expect(within(link).getByText(description)).toBeTruthy();
  expect(within(link).queryByText("Example")).toBeNull();
});
