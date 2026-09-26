// Run: node --test   (from this folder; no install)
import test from "node:test";
import assert from "node:assert/strict";
import { split } from "./tip.mjs";

test("a 15% tip on $80 for two", () => {
	assert.deepEqual(split({ bill: 80, percent: 15, people: 2 }), { tip: 12, total: 92, each: 46 });
});

test("shares round up to the cent", () => {
	assert.deepEqual(split({ bill: 100, percent: 0, people: 3 }), { tip: 0, total: 100, each: 33.34 });
});

test("cents do not drift", () => {
	assert.deepEqual(split({ bill: 0.3, percent: 10, people: 1 }), { tip: 0.03, total: 0.33, each: 0.33 });
});

test("bad input gets a message, not a number", () => {
	assert.ok("error" in split({ bill: -1, percent: 15, people: 1 }));
	assert.ok("error" in split({ bill: 10, percent: 150, people: 1 }));
	assert.ok("error" in split({ bill: 10, percent: 15, people: 0 }));
	assert.ok("error" in split({ bill: Number.NaN, percent: 15, people: 1 }));
});
