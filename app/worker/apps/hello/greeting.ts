import { z } from "zod";
import { defineAction } from "../../api/contract.ts";

/** GET greeting?name=Ada → { message: "Hello, Ada!" } */
export const greeting = defineAction({
  operationId: "hello.greeting", summary: "Greet a person", description: "Trim a name, use its first 40 characters, or greet the world when blank.",
  input: z.strictObject({ name: z.string().optional().describe("Who to greet; leave it out to greet the world.") }), output: z.strictObject({ message: z.string() }),
  encoding: "query", effect: "read", agentAvailable: true, requiresIdentity: false, errors: {},
  examples: [{ input: { name: "Ada" }, output: { message: "Hello, Ada!" } }],
  handler(_request, _env, { url }) {
  const name = (url.searchParams.get("name") ?? "").trim().slice(0, 40) || "world";
  return Response.json({ message: `Hello, ${name}!` });
  },
});
