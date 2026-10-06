// A skill that does business work lists the company actions it calls in `actions.json` beside its SKILL.md.
// The skill folders are the whole list, as the app folders are the catalogue: nobody edits a second one.
// What a skill needs is worked out from the routes those actions name, so Access shows what dispatch enforces.
// wiki/stack/company-api.md#build-a-skill-on-actions
import { z } from "zod";
import { apiActions } from "../api/router.ts";
import { appActions } from "../apps/index.ts";
import { needFor, type Registration } from "../api/contract.ts";
import { registered, type Level } from "./key-levels.ts";
import { listedKeys } from "./policy.ts";

type Levels = Record<string, Level>;
/** What one skill needs to run: a level per area and per saved key. Project code is among the keys. */
export type Skill = { id: string; title: string; areas: Levels; keys: Levels };

const declared = z.object({ title: z.string().trim().min(1), actions: z.array(z.string()).min(1) });

/** Raise `held` to what one more action needs: Look up & change covers Look up. */
function raise(held: Levels, ids: readonly string[], need: Level): void {
  for (const id of ids) if (held[id] !== "write") held[id] = need;
}

/**
 * Each skill with what it needs, sorted by folder: per area and per key the highest level any listed action
 * needs, and Project code, since a skill reaches a device with the project. Throws, naming the skill, when its
 * file has no title or no action, or lists an id no route registers.
 */
export function listSkills(files: Record<string, unknown>, registry: readonly Registration[]): Skill[] {
  return Object.keys(files).sort().map(path => {
    // "../../../.agents/skills/refund/actions.json" → "refund"
    const id = path.split("/").at(-2)!;
    const file = declared.safeParse(files[path]);
    if (!file.success) throw new Error(`.agents/skills/${id}/actions.json needs a title and a list of actions.`);
    const skill: Skill = { id, title: file.data.title, areas: {}, keys: registered("code") ? { code: "read" } : {} };
    for (const operation of file.data.actions) {
      const found = registry.find(({ action }) => action.operationId === operation);
      if (!found) throw new Error(`.agents/skills/${id}/actions.json lists ${operation}, which no route registers.`);
      const need = needFor(found.action, found.method);
      raise(skill.areas, found.access && "apps" in found.access ? found.access.apps : [], need);
      raise(skill.keys, listedKeys(found.access).filter(registered), need);
    }
    return skill;
  });
}

const files = import.meta.glob("../../../.agents/skills/*/actions.json", { eager: true, import: "default" });

/** Read on each Access status, never when the Worker starts: a skill file with a mistake stops Access, not the business. */
export const skills = (): Skill[] => listSkills(files, [...apiActions, ...appActions]);
