import { expect, it } from "vitest";
import { split } from "./tip";

it("a 15% tip on $80 for two", () => {
  expect(split({ bill: 80, percent: 15, people: 2 })).toEqual({ tip: 12, total: 92, each: 46 });
});

it("shares round up to the cent", () => {
  expect(split({ bill: 100, percent: 0, people: 3 })).toEqual({ tip: 0, total: 100, each: 33.34 });
});

it("cents do not drift", () => {
  expect(split({ bill: 0.3, percent: 10, people: 1 })).toEqual({ tip: 0.03, total: 0.33, each: 0.33 });
});

it("bad input gets a message, not a number", () => {
  expect(split({ bill: -1, percent: 15, people: 1 })).toEqual({ error: "Enter the bill amount." });
  expect(split({ bill: Number.NaN, percent: 15, people: 1 })).toEqual({ error: "Enter the bill amount." });
  expect(split({ bill: 10, percent: 150, people: 1 })).toEqual({ error: "Pick a tip from 0 to 100%." });
  expect(split({ bill: 10, percent: -1, people: 1 })).toEqual({ error: "Pick a tip from 0 to 100%." });
  expect(split({ bill: 10, percent: Number.NaN, people: 1 })).toEqual({ error: "Pick a tip from 0 to 100%." });
  expect(split({ bill: 10, percent: 15, people: 0 })).toEqual({ error: "At least one person pays." });
  expect(split({ bill: 10, percent: 15, people: 1.5 })).toEqual({ error: "At least one person pays." });
});
