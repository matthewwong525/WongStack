// Run: node --test   (from this folder; no install)
import test from "node:test";
import assert from "node:assert/strict";
import api from "./api.mjs";

const get = path => api.fetch(new Request(`https://mini.example${path}`));

test("the greeting names the person", async () => {
	const response = await get("/hello/api/greeting?name=Ada");
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { message: "Hello, Ada!" });
});

test("no name greets the world", async () => {
	assert.deepEqual(await (await get("/hello/api/greeting?name=%20")).json(), { message: "Hello, world!" });
});

test("an unknown route is not found", async () => {
	assert.equal((await get("/hello/api/nothing")).status, 404);
});
