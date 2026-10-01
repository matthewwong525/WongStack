// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { routes } from "../../router";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const open = async (answer: () => Promise<Response>) => {
  const fetchMock = vi.fn(answer);
  vi.stubGlobal("fetch", fetchMock);
  const router = createMemoryRouter(routes, { initialEntries: ["/apps/hello/"] });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  await screen.findByRole("heading", { level: 1, name: "Hello" });
  return fetchMock;
};

const greet = async (name: string) => {
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: name } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Say hello" }));
  });
};

it("shows the example inside the page frame, with the label above the field", async () => {
  await open(async () => Response.json({ message: "Hello, world!" }));

  expect(screen.getByText("Example app")).toBeTruthy();
  expect(screen.getByText("A small example you can make yours.")).toBeTruthy();
  const field = screen.getByLabelText("Your name");
  expect(field.getAttribute("autocomplete")).toBe("given-name");
  expect(screen.getByText("Your name").compareDocumentPosition(field)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(screen.getByRole("heading", { level: 1 }).closest("main")).not.toBeNull();
  expect(screen.getByRole("link", { name: "WongStack" }).getAttribute("href")).toBe("/");

  const message = screen.getByText("Your greeting will appear here.");
  expect(message.getAttribute("aria-live")).toBe("polite");
  expect(screen.getByRole("button", { name: "Say hello" }).compareDocumentPosition(message)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});

it("asks the app's own API and announces the greeting", async () => {
  const fetchMock = await open(async () => Response.json({ message: "Hello, Ada Lovelace!" }));

  await greet("Ada Lovelace");

  expect(fetchMock).toHaveBeenCalledWith("/apps/hello/api/greeting?name=Ada%20Lovelace");
  expect((await screen.findByText("Hello, Ada Lovelace!")).getAttribute("aria-live")).toBe("polite");
});

it("says to try again when the API answers an error", async () => {
  await open(async () => Response.json({ error: "Not found" }, { status: 404 }));

  await greet("Ada");

  expect(await screen.findByText("Something went wrong. Try again.")).toBeTruthy();
});

it("says to try again when the network fails", async () => {
  await open(async () => Promise.reject(new TypeError("offline")));

  await greet("Ada");

  expect(await screen.findByText("Something went wrong. Try again.")).toBeTruthy();
});
