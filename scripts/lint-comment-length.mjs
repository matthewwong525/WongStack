// An oxlint plugin: a comment runs two lines at most, and a comment line 120 characters at most.
// .agents/rules/code.md says why; a config registers it under `jsPlugins`.

const MAX_LINES = 2;
const MAX_WIDTH = 120;
const LICENSE = /@license\b|SPDX-License-Identifier|\bCopyright\b/;
// Comments a tool reads: settings, not notes.
const TOOL = new RegExp(`^[\\s*]*(?:${[
  '@vitest-environment\\b', '/\\s*<reference\\b', '@ts-(?:expect-error|ignore|nocheck)\\b', '(?:oxlint|eslint)-(?:disable|enable)\\b',
  '(?:v8|c8|istanbul) ignore\\b', 'jscpd:ignore-', 'prettier-ignore\\b',
].join('|')})`);

const toolReads = comment => comment.type === 'Shebang' || TOOL.test(comment.value);

// Counted comments as runs: consecutive lines with only whitespace between. A tool-read comment ends a run.
export function commentRuns(comments, text) {
  const runs = [];
  let open = null;
  for (const comment of [...comments].sort((a, b) => a.range[0] - b.range[0])) {
    if (toolReads(comment)) { open = null; continue; }
    const joins = open && comment.loc.start.line <= open.end + 1 && !text.slice(open.offset, comment.range[0]).trim();
    if (joins) open.comments.push(comment);
    else runs.push(open = { start: comment.loc.start.line, comments: [comment] });
    open.end = comment.loc.end.line;
    open.offset = comment.range[1];
  }
  return runs.filter(run => !run.comments.some(comment => LICENSE.test(comment.value)));
}

const limit = (context, fallback) => (Number.isInteger(context.options?.[0]) ? context.options[0] : fallback);
const at = line => ({ start: { line, column: 0 }, end: { line, column: 1 } });
const schema = [{ type: 'integer', minimum: 1 }];

function rule(description, check) {
  return {
    meta: { type: 'suggestion', docs: { description }, schema },
    create: context => ({
      Program() {
        const source = context.sourceCode;
        check(context, commentRuns(source.getAllComments(), source.text), source.text);
      },
    }),
  };
}

const maxCommentLines = rule('A comment runs two lines at most.', (context, runs) => {
  const max = limit(context, MAX_LINES);
  for (const run of runs) {
    const count = run.end - run.start + 1;
    if (count > max) {
      context.report({ loc: at(run.start), message: `This comment runs ${count} lines; the limit is ${max}. Keep the why in ${max} lines, `
        + 'or move it to a test, a clearer name, or the wiki.' });
    }
  }
});

const maxCommentWidth = rule('A line holding a comment is 120 characters at most.', (context, runs, text) => {
  const max = limit(context, MAX_WIDTH);
  const lines = text.split(new RegExp('\\r\\n|[\\n\\r\\u2028\\u2029]'));
  for (const run of runs) {
    for (let line = run.start; line <= run.end; line += 1) {
      const width = lines[line - 1].length;
      if (width > max) context.report({ loc: at(line), message: `This comment line is ${width} characters wide; the limit is ${max}.` });
    }
  }
});

export default {
  meta: { name: 'comment-length' },
  rules: { 'max-comment-lines': maxCommentLines, 'max-comment-width': maxCommentWidth },
};
