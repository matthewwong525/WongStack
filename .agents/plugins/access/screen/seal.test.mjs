import { beforeAll, expect, it } from "vitest";
import { makePair, open, seal } from "./seal.mjs";

let pair;
beforeAll(async () => { pair = await makePair(); });

it("opens a sealed key only with the matching private half, and two seals of one key differ", async () => {
  const sealed = await seal("shpat_made-up-9f2c", pair.publicKey);
  expect(sealed).not.toContain("shpat_made-up");
  expect(Object.keys(JSON.parse(sealed))).toEqual(["v", "wrapped", "iv", "data"]);
  expect(await open(sealed, pair.privateKey)).toBe("shpat_made-up-9f2c");
  expect(await seal("shpat_made-up-9f2c", pair.publicKey)).not.toBe(sealed);
  const other = await makePair();
  await expect(open(sealed, other.privateKey)).rejects.toThrow();
  await expect(open(JSON.stringify({ ...JSON.parse(sealed), v: 2 }), pair.privateKey)).rejects.toThrow("not a sealed key");
});

it("seals and opens a 4 KB key file, such as a service account's", async () => {
  const file = JSON.stringify({ type: "service_account", private_key: "k".repeat(4096) });
  expect(await open(await seal(file, pair.publicKey), pair.privateKey)).toBe(file);
});
