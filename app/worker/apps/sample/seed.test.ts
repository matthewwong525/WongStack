import { expect, it } from "vitest";
import { body } from "../../../tests/body";
import { owner, req, seeded } from "../../../tests/employee-access/connections";
import { management } from "../../employee-access/management";
import { authorizeRequest, currentPolicy } from "../../employee-access/policy";

// What the practice list shows only in WongStack's own repository, which builds the sample area, the tip calculator
// and the sample skill. No install gets them, so this file stays here with the area: worker/employee-access/seed.test.ts
// covers what every install has.
it("staging shows the sample area with no screen and each state of the sample skill", async () => {
  const { sql, env, practice } = seeded();
  try {
    const opened = await body(await management(req("status", "GET"), env, owner));
    // The sample area has no screen, and the sample skill needs it at Look up & change, Hello at Look up, and Project code:
    // Dana holds all of it, the role lacks the area, and Eli lacks the key.
    expect(opened.areas).toMatchObject([{ id: "hello", screen: true }, { id: "sample", title: "Sample records", screen: false }, { id: "tips", screen: true }]);
    expect(opened.skills).toEqual([{ id: "sample-report", title: "Sample report", areas: { sample: "write", hello: "read" }, keys: { code: "read" } }]);
    const sets = Object.fromEntries([...opened.roles, ...opened.people].map(({ name, email, apps, keys }) => [name ?? email, { apps, keys }]));
    expect(sets).toMatchObject({ Helpers: { apps: { hello: "write" }, keys: { code: "read" } },
      "dana@example.invalid": { apps: { hello: "write", tips: "write", sample: "write" }, keys: { cloudflare: "read", code: "read" } },
      "eli@example.invalid": { apps: { hello: "read", tips: "read", sample: "write" }, keys: {} } });
    expect(sets.Helpers.apps).not.toHaveProperty("sample");
    expect(await currentPolicy(env, practice("dana@example.invalid"))).toMatchObject({ state: "current",
      apps: new Map([["hello", "write"], ["sample", "write"], ["tips", "write"]]) });
    // The sample area is Eli's to change, though Hello is not.
    for (const [app, allowed] of [["sample", true], ["hello", false]] as const) {
      expect((await authorizeRequest(env, practice("eli@example.invalid"), { apps: [app] }, "write")) === null, app).toBe(allowed);
    }
  } finally { sql.close(); }
});
