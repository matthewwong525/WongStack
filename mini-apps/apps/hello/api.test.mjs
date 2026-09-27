// Run: node --test   (from this folder; no install)
import test from "node:test";
import assert from "node:assert/strict";
import api from "./api.mjs";

const get = path => api.fetch(new Request(`https://mini.example${path}`));

test("the greeting names the person", async () => {
	const response = await get("/apps/hello/api/greeting?name=Ada");
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { message: "Hello, Ada!" });
});

test("no name greets the world", async () => {
	assert.deepEqual(await (await get("/apps/hello/api/greeting?name=%20")).json(), { message: "Hello, world!" });
});

test("an unknown route is not found", async () => {
	assert.equal((await get("/apps/hello/api/nothing")).status, 404);
});

test("a known route with the wrong method is not found", async () => {
	const response = await api.fetch(new Request("https://mini.example/apps/hello/api/greeting", { method: "POST" }));
	assert.equal(response.status, 404);
	assert.deepEqual(await response.json(), { error: "Not found" });
});

test("a route named for an inherited property is not found", async () => {
	for (const route of ["constructor", "__proto__", "toString"]) {
		assert.equal((await get(`/apps/hello/api/${route}`)).status, 404, route);
	}
});
