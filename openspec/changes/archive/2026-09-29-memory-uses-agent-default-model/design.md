# Design

## Context

See [the proposal](proposal.md). `run.mjs` starts a fresh headless Claude Code or Codex process. Today it always passes `--model`: `haiku` for Claude and `gpt-5.4-mini` for Codex, unless the respective `WONG_MEMORY_MODEL` or `WONG_MEMORY_CODEX_MODEL` variable is set. The Codex fallback has retired for ChatGPT-signed-in users. The hook and capture workflow do not need a specific model ID.

## Goals / Non-Goals

**Goals:** Make both agents' unattended capture follow the model their own CLI selects by default, while retaining a deliberate per-agent override.

**Non-Goals:** Parse Codex's experimental model catalog, infer the active Paseo chat's model, or alter the headless run's permissions and capture rules.

## Decisions

### Omit the model flag by default

Build the headless argument arrays with `--model <value>` only when the corresponding environment variable contains a non-empty model name. Otherwise pass no model flag. Codex then follows its config precedence (project, user, managed, built-in); Claude Code uses its CLI default. This delegates retirement handling to the installed agent. Keep the existing variable names and all other launch arguments.

An automatic small-model selector would depend on the shape and labels of a changing catalog. Replacing the fixed ID with a new fixed small ID would recreate the same maintenance task. Both alternatives were declined in favor of the user's chosen default-model behavior.

### Test argument selection without invoking a model

Use `agentCommand()` to assert the default path omits `-m` and `--model` and that each explicit override adds the correct flag and value. Update the existing fake-CLI hook test so it does not expect `--model haiku`. These checks exercise the retirement failure path without spending model quota or requiring account-specific availability.

## Risks / Trade-offs

- **A larger normal model can spend more allowance on capture** → revise `wiki/development/memory.md` to state this plainly and document the optional per-agent override. Remove the old fixed dollar estimate, which was measured with Haiku.
- **A person's own configured model can also retire** → WongStack will not pin another model, but the person may still need to update their agent's normal configuration. A memory-specific override is likewise their responsibility.

## Migration Plan

Ship the runner, tests, wiki update, and a minor payload changelog entry together. Installed repos receive the new runner through `/wong-sync`; there is no data migration or manual step. To roll back, restore the prior runner, though its retired Codex default can make capture fail again.
