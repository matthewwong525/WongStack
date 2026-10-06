---
name: sample-report
description: Preview sample.
hidden: true
disable-model-invocation: true
---

# sample-report

Source repo only: a made-up skill, so a preview's [Skills view](../../../wiki/stack/employee-access.md#the-skills-view) has one to show. It is built [on actions](../../../wiki/stack/company-api.md#build-a-skill-on-actions): each call goes through the app under your own login, and [`actions.json`](actions.json) lists every one.

1. Greet: `node scripts/company-api.mjs call hello.greeting --file -`, with `{}`.
2. List the records: `node scripts/company-api.mjs call sample.records --file -`, with `{}`.
3. Mark the first record not done: `node scripts/company-api.mjs call sample.mark --file -`, with `{"id":"<its id>"}`.
4. Report each record's customer, total, and whether it is done.
