---
name: "OPSX: Apply"
description: Implement tasks from an OpenSpec change (Experimental)
category: Workflow
tags: [workflow, artifacts, experimental]
---

Invoke the `openspec-apply-change` skill (via the Skill tool) and follow it verbatim — that skill owns this command's behavior, including handing a completed change to `/save`. Anything after `/opsx:apply` is the change name; pass it through.
