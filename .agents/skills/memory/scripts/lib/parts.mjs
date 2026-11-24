// WongStack's parts of memory: its store, topics, lookups, and tidy. wiki/development/memory.md#the-parts
// Each part loads its file only when called, so a hook pays for what it uses.
const lazy = (file, name) => async (...args) => (await import(file))[name](...args);

export default {
  // Which store, and how this computer signs in: the app's memory route, as the company sign-in.
  connect: lazy('../../../../memory/d1/connect.mjs', 'connect'),
  // Code areas from areas.json and company pages from knowledge/, as topics.
  topics: lazy('../../../../memory/topics.mjs', 'topics'),
  // The verb tags, and the slash commands that name them.
  steps: {
    explore: ['/explore'], plan: ['/plan'], apply: ['/apply'], save: ['/save'], ship: ['/ship'],
    verify: ['/verify'], routine: ['/routine'], sync: ['/wong-sync'], setup: ['/wong-setup'], close: ['/close'],
    improve: ['/improve-code', '/improve'], dream: ['/memory:dream-memory', '/dream-memory', '/dream'],
  },
  currentSlug: lazy('../../../../memory/lookup.mjs', 'currentSlug'),
  slugState: lazy('../../../../memory/lookup.mjs', 'slugState'),
  person: lazy('../../../../memory/lookup.mjs', 'personPage'),
  lookup: {
    named: lazy('../../../../memory/lookup.mjs', 'changePaths'),
    before: lazy('../../../../memory/lookup.mjs', 'movedLines'),
    after: lazy('../../../../memory/lookup.mjs', 'lookupLines'),
    // The files each change touched, read fresh from git history.
    files: lazy('../../../../memory/lookup.mjs', 'changeFiles'),
  },
  tidy: {
    pages: lazy('../../../../memory/tidy-pages.mjs', 'tidyPages'),
    deny: lazy('../../../../memory/tidy-pages.mjs', 'tidyDeny'),
    // Company knowledge: its own folder in the run's copy before its first map, with every chat's held saves sent;
    // removed again when the run ends.
    prepare: lazy('../../../../memory/tidy-pages.mjs', 'tidyPrepare'),
    cleanup: lazy('../../../../memory/tidy-pages.mjs', 'tidyCleanup'),
    publish: 'save a `knowledge/` page by wiki/stack/company-knowledge.md#save-a-page, and first merge a `<page>.mine.md` beside it '
      + '(an ended chat\'s clashing save) into it and delete the `.mine`; for any other, `git fetch origin main`, '
      + '`git switch -c <branch> origin/main`, then `/ship` minus its closing question.',
  },
  // Finished changes, one packed file each: a reader with list(), files(folder), and read(folder, path).
  archive: async ctx => (await import('../../../../loop/scripts/archive.mjs')).archiveReader(ctx.root),
  sessionStart: lazy('../../../../memory/session-start.mjs', 'sessionStart'),
  // WongStack's admin jobs on its own store: migrations, people, and old keys.
  commands: lazy('../../../../memory/d1/admin.mjs', 'adminCommands'),
};
