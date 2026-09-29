#!/usr/bin/env node
/**
 * Put the mini apps into the main app's build, from each app's `app.json`.
 *
 *   <assets>/apps/<name>/      each app's pages, with no handler, test, or TypeScript file
 *   <assets>/apps/apps.json    every app's title, description, and link, for the landing page
 *
 * `scripts/cf-build.sh` runs this after every build of the main app, so the
 * Worker serves exactly the apps being shipped. No model step: the output
 * depends only on the folders, sorted by name, so the same tree always writes
 * the same bytes.
 *
 * Each folder under `mini-apps/apps/` is one app. It needs a lowercase name
 * (letters, digits, hyphens; it is the URL path) and an `app.json` whose
 * `title` and `description` are non-empty strings. Any failure names the
 * folder, writes nothing, and exits 1, which stops the build.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, parseCli } from "./lib-cli.mjs";

const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** The app's manifest, or the reason it is unusable. */
function readApp(appsDir, name) {
  const where = `mini-apps/apps/${name}`;
  if (!NAME.test(name)) return { error: `${where}: the folder name must use only lowercase letters, digits, and hyphens` };
  const manifest = join(appsDir, name, "app.json");
  if (!existsSync(manifest)) return { error: `${where}: app.json is missing` };
  let app;
  try {
    app = JSON.parse(readFileSync(manifest, "utf8"));
  } catch (error) {
    return { error: `${where}: app.json is not valid JSON (${error.message})` };
  }
  for (const field of ["title", "description"]) {
    if (typeof app?.[field] !== "string" || !app[field].trim()) {
      return { error: `${where}: app.json needs a "${field}" (a non-empty string)` };
    }
  }
  return { name, title: app.title.trim(), description: app.description.trim(), api: existsSync(join(appsDir, name, "api.mjs")) };
}

/** Every app folder, sorted by name, or the list of failures. */
function readApps(appsDir) {
  const names = existsSync(appsDir)
    ? readdirSync(appsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
        .map(entry => entry.name)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    : [];
  const apps = names.map(name => readApp(appsDir, name));
  const errors = apps.filter(app => app.error).map(app => app.error);
  return errors.length ? { errors } : { apps };
}

/** The list as data: what the landing page reads from `/apps/apps.json`. */
function appsJson(apps) {
  const list = apps.map(({ name, title, description }) => ({ name, title, description, href: `/apps/${name}/` }));
  return `${JSON.stringify(list, null, 2)}\n`;
}

/** Never copied: the Worker bundles each handler, and the pages need no test or source. */
const PRIVATE = /\.[cm]?ts$|\.test\.|^api\.mjs$/i;

const copyable = source => {
  const name = basename(source);
  return !name.startsWith(".") && !PRIVATE.test(name);
};

/**
 * Copy every app's pages into `<assets>/apps/`, then write the list as data.
 * There is no list page: the router sends `/apps/` to the landing page, which
 * shows the list. `/apps/` belongs to the mini apps, so an older copy goes first.
 */
function writeInto(appsDir, assetsDir, apps) {
  const out = join(assetsDir, "apps");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const app of apps) cpSync(join(appsDir, app.name), join(out, app.name), { recursive: true, filter: copyable });
  writeFileSync(join(out, "apps.json"), appsJson(apps));
}

if (isMain(import.meta.url)) {
  const usage = "usage: node scripts/mini-dashboard.mjs --into <assets folder> [--dir <mini-apps folder>]  (copies the apps into <assets>/apps/; exits 1 on a bad app.json)";
  const { values } = parseCli({ usage, options: { dir: { type: "string" }, into: { type: "string" } } });
  if (!values.into) {
    console.error(usage);
    process.exit(2);
  }
  const dir = values.dir ? resolve(values.dir) : resolve(dirname(fileURLToPath(import.meta.url)), "../mini-apps");
  const appsDir = join(dir, "apps");
  const { apps, errors } = readApps(appsDir);
  if (errors) {
    for (const error of errors) console.error(`mini-dashboard: ERROR — ${error}`);
    process.exit(1);
  }
  writeInto(appsDir, resolve(values.into), apps);
  console.log(`mini-dashboard: ${apps.length} app(s) — copied into ${join(values.into, "apps")}`);
}
