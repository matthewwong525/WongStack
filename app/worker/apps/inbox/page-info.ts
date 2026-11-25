// What the inbox reads from a review page's HTML once, when it is put: the page itself never reaches the app's
// screen, only its sealed frame. wiki/review-pages.md
import { z } from "zod";

export const pageInfo = z.strictObject({ key: z.string().nullable(), ownBack: z.boolean(), labels: z.record(z.string(), z.string()) });
export type PageInfo = z.infer<typeof pageInfo>;

/** The notes key of the plan's own review page, from its `<body data-change>`, or null when it names none. */
const notesKey = (html: string) => {
  const change = /<body\b[^>]*\sdata-change="([\w-]{1,100})"/i.exec(html)?.[1];
  return change ? `wong-review3:${change}` : null;
};

/** Whether the page draws its own Back, from its `<body data-own-back>`; a page built before that draws none. */
const ownBack = (html: string) => /<body\b[^>]*\sdata-own-back(?=[\s=>])/i.test(html);

const ENTITIES: Record<string, string> = { "&quot;": '"', "&lt;": "<", "&gt;": ">", "&amp;": "&" };
const buttons = z.array(z.object({ name: z.string(), label: z.string() }));

/** Each button's label by action, from the page's `#ready data-actions`; a page that names none, or names them
 *  badly, gives none. */
function actionLabels(html: string): Record<string, string> {
  const escaped = /<div id="ready" data-actions="([^"]*)"/.exec(html)?.[1];
  if (!escaped) return {};
  try {
    const found = buttons.safeParse(JSON.parse(escaped.replace(/&(quot|lt|gt|amp);/g, entity => ENTITIES[entity]))).data ?? [];
    return Object.fromEntries(found.map(button => [button.name, button.label]));
  } catch {
    return {};
  }
}

export const readPageInfo = (html: string): PageInfo => ({ key: notesKey(html), ownBack: ownBack(html), labels: actionLabels(html) });
