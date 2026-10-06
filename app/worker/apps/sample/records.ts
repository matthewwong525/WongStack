import { z } from "zod";
import { defineAction } from "../../api/contract.ts";

// Made-up data: nothing here reads or writes the database.
const RECORDS = [
  { id: "r-1", customer: "Ada Example", total: 42, done: true },
  { id: "r-2", customer: "Bo Example", total: 18, done: false },
  { id: "r-3", customer: "Cy Example", total: 7, done: false },
];
const record = z.strictObject({ id: z.string(), customer: z.string(), total: z.number(), done: z.boolean() });
const marking = z.strictObject({ id: z.string().describe("The record to mark, such as r-2.") });

/** GET records → { records: [...] } */
export const records = defineAction({
  operationId: "sample.records", summary: "List the sample records", description: "Return three made-up records. Nothing is read from the business.",
  input: z.strictObject({}), output: z.strictObject({ records: z.array(record) }),
  encoding: "none", effect: "read", agentAvailable: true, errors: {}, examples: [{ input: {}, output: { records: RECORDS } }],
  handler: () => Response.json({ records: RECORDS }),
});

/** POST mark { id } → the record, marked done. The change is made up: the next list is as before. */
export const mark = defineAction({
  operationId: "sample.mark", summary: "Mark a sample record done", description: "Answer with one made-up record marked done. Nothing is saved, so the list does not change.",
  input: marking, output: record,
  encoding: "json", effect: "write", agentAvailable: true, confirmWith: "sample.records",
  errors: { not_found: "No sample record has that id." }, examples: [{ input: { id: "r-2" }, output: { ...RECORDS[1], done: true } }],
  handler(_request, _env, { input }) {
    const { id } = marking.parse(input);
    const found = RECORDS.find(item => item.id === id);
    return found ? Response.json({ ...found, done: true }) : Response.json({ error: { code: "not_found" } }, { status: 404 });
  },
});
