// How a kept check and a written promise are read, for verify-journeys.mjs and .github/scripts/loosened-checks.mjs.
// Both take text, so the guard can read a spec as git holds it at two commits. Needs Node only.
import { createHash } from 'node:crypto';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// A spec or delta file as its requirements: the `## ` section each sits under, its scenarios, and each
// scenario's `promise`: its lines from THEN to the end.
export function readSpec(source) {
  const requirements = [];
  let section = '';
  let requirement = null;
  let scenario = null;
  for (const line of source.split(/\r?\n/)) {
    const [, level, title] = /^(#{1,4}) +(.*?)\s*$/.exec(line) ?? [];
    if (!level) {
      if (scenario && line.trim() && (scenario.promise.length || /^\s*[-*]\s*\*\*THEN\*\*/.test(line))) scenario.promise.push(line.trim());
      continue;
    }
    scenario = null;
    if (level.length < 3) { section = title; requirement = null; }
    else if (level.length === 3) {
      requirement = title.startsWith('Requirement: ') ? { section, name: title.slice('Requirement: '.length).trim(), scenarios: [] } : null;
      if (requirement) requirements.push(requirement);
    } else if (requirement && title.startsWith('Scenario: ')) {
      scenario = { name: title.slice('Scenario: '.length).trim(), promise: [] };
      requirement.scenarios.push(scenario);
    }
  }
  return requirements;
}

/** The hash of a scenario's THEN lines among a spec's requirements; null when it is not there. */
export function scenarioDigest(requirements, { requirement, scenario }) {
  const found = requirements.find(entry => entry.name === requirement)?.scenarios.find(entry => entry.name === scenario);
  return found ? digest(found.promise.join('\n')) : null;
}

/** The names of the requirements a delta spec lists as MODIFIED or REMOVED. */
export function rewrittenRequirements(requirements) {
  return requirements.filter(requirement => /^(MODIFIED|REMOVED)\b/.test(requirement.section)).map(requirement => requirement.name);
}

/** Whether two kept checks do the same steps and expect the same things, whatever else differs. */
export function sameJourney(one, other) {
  return [one, other].every(journey => journey !== null && typeof journey === 'object')
    && JSON.stringify(one.steps) === JSON.stringify(other.steps)
    && JSON.stringify(one.expect) === JSON.stringify(other.expect);
}
