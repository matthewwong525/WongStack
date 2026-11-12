// What the page's tests use to draw it and read it as a person does: by role and name, by words, by a field's label.
// A small stand-in for Testing Library, which a file outside app/ can't import. Tests only: the page never loads it.
import { vi } from "vitest";
import { client } from "./api.mjs";
import { Screen } from "./context.mjs";
import { mount } from "./main.mjs";
import { Router } from "./router.mjs";
import { html, render as draw } from "./vendor/preact-htm.mjs";

const IMPLICIT = { A: el => (el.hasAttribute("href") ? "link" : null), BUTTON: () => "button", NAV: () => "navigation", MAIN: () => "main",
  TABLE: () => "table", TR: () => "row", TD: () => "cell", TH: () => "columnheader", THEAD: () => "rowgroup", TBODY: () => "rowgroup",
  UL: () => "list", OL: () => "list", LI: () => "listitem", FIELDSET: () => "group", DETAILS: () => "group", TEXTAREA: () => "textbox",
  P: () => "paragraph", SELECT: el => (el.multiple || el.size > 1 ? "listbox" : "combobox"), OPTION: () => "option",
  SECTION: el => (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") ? "region" : null),
  FORM: el => (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") ? "form" : null),
  H1: () => "heading", H2: () => "heading", H3: () => "heading", H4: () => "heading", H5: () => "heading", H6: () => "heading",
  INPUT: el => ({ checkbox: "checkbox", radio: "radio", button: "button", submit: "button", reset: "button", email: "textbox", text: "textbox",
    search: "searchbox", url: "textbox", tel: "textbox", number: "spinbutton" })[el.type] ?? null };
const BLOCK = new Set(["DIV", "P", "LI", "UL", "OL", "SECTION", "H1", "H2", "H3", "H4", "H5", "H6", "TABLE", "TR", "TD", "TH", "FIELDSET",
  "LEGEND", "FORM", "NAV", "DETAILS", "SUMMARY", "BR", "MAIN", "HEADER", "FOOTER", "THEAD", "TBODY"]);

const normal = text => text.replace(/\s+/g, " ").trim();
export const roleOf = el => el.getAttribute("role")?.split(" ")[0] || IMPLICIT[el.tagName]?.(el) || null;
const hidden = el => !!el.closest("[aria-hidden='true'], [hidden]");

// The words an element gives to a name: what a screen reader reads, aria-hidden parts left out.
function textOf(node, skip) {
  if (node.nodeType === 3) return node.data;
  if (node.nodeType !== 1 || node === skip || node.getAttribute("aria-hidden") === "true") return "";
  if (node.tagName === "SELECT") return node.selectedOptions[0]?.textContent ?? "";
  if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") return node.value;
  if (node.hasAttribute("aria-label")) return node.getAttribute("aria-label");
  const inner = [...node.childNodes].map(child => textOf(child, skip)).join("");
  return BLOCK.has(node.tagName) ? ` ${inner} ` : inner;
}
const byIds = (el, ids) => ids.split(/\s+/).map(id => el.ownerDocument.getElementById(id)).filter(Boolean).map(item => textOf(item)).join(" ");
const FROM_CONTENT = new Set(["button", "link", "heading", "cell", "columnheader", "row", "menuitem", "checkbox", "radio", "option", "tab", "listitem", "status", "alert"]);

/** An element's accessible name, near enough: labelled by, then label, then its own words for a role named so. */
export function nameOf(el) {
  if (el.hasAttribute("aria-labelledby")) return normal(byIds(el, el.getAttribute("aria-labelledby")));
  if (el.hasAttribute("aria-label")) return normal(el.getAttribute("aria-label"));
  if (el.labels?.length) return normal([...el.labels].map(label => textOf(label, el)).join(" "));
  if (el.tagName === "FIELDSET") return normal(el.querySelector(":scope > legend")?.textContent ?? "");
  if (FROM_CONTENT.has(roleOf(el))) return normal(textOf(el));
  return normal(el.getAttribute("title") ?? "");
}

const matches = (matcher, text, el) => (typeof matcher === "string" ? normal(text) === matcher
  : matcher instanceof RegExp ? matcher.test(text) : matcher(text, el));
const said = (what, matcher) => `${what} ${matcher instanceof RegExp ? matcher : JSON.stringify(String(matcher))}`;

function queries(root) {
  const all = () => [...root.querySelectorAll("*")];
  const byRole = (role, { name, hidden: withHidden = false, checked, level } = {}) => all().filter(el => roleOf(el) === role
    && (withHidden || !hidden(el)) && (name === undefined || matches(name, nameOf(el), el))
    && (checked === undefined || el.checked === checked) && (level === undefined || Number(el.tagName.slice(1)) === level));
  const byText = (matcher, { selector = "*" } = {}) => all().filter(el => !["SCRIPT", "STYLE"].includes(el.tagName) && el.matches(selector)
    && matches(matcher, normal([...el.childNodes].filter(node => node.nodeType === 3).map(node => node.data).join("")), el));
  const byLabel = matcher => {
    const found = new Set();
    for (const el of all()) {
      if (el.tagName === "LABEL" && matches(matcher, normal(textOf(el, el.control)), el) && el.control) found.add(el.control);
      if (el.hasAttribute("aria-label") && matches(matcher, el.getAttribute("aria-label"), el)) found.add(el);
      if (el.hasAttribute("aria-labelledby") && matches(matcher, normal(byIds(el, el.getAttribute("aria-labelledby"))), el)) found.add(el);
    }
    return [...found];
  };
  const one = (list, what) => {
    if (list.length !== 1) throw new Error(`${list.length ? "Found more than one" : "Found no"} ${what}\n${normal(root.textContent).slice(0, 2000)}`);
    return list[0];
  };
  const none = (list, what) => {
    if (list.length > 1) throw new Error(`Found more than one ${what}`);
    return list[0] ?? null;
  };
  const many = (list, what) => {
    if (!list.length) throw new Error(`Found no ${what}`);
    return list;
  };
  const set = {};
  for (const [kind, find] of Object.entries({ Role: byRole, Text: byText, LabelText: byLabel })) {
    const what = args => (kind === "Role" ? said(`role ${args[0]} named`, args[1]?.name ?? "anything") : said(kind, args[0]));
    set[`getBy${kind}`] = (...args) => one(find(...args), what(args));
    set[`queryBy${kind}`] = (...args) => none(find(...args), what(args));
    set[`getAllBy${kind}`] = (...args) => many(find(...args), what(args));
    set[`queryAllBy${kind}`] = (...args) => find(...args);
    set[`findBy${kind}`] = (...args) => waitFor(() => one(find(...args), what(args)));
    set[`findAllBy${kind}`] = (...args) => waitFor(() => many(find(...args), what(args)));
  }
  return set;
}

/** The queries for one part of the page. */
export const within = element => queries(element);
/** The queries for the whole page, popups included: they are drawn at the end of the body. */
export const screen = queries(document.body);

/** Tries `check` until it passes, as the page draws after each change. */
export const waitFor = check => vi.waitFor(check, { timeout: 2000, interval: 10 });
/** Lets the page draw what the last event changed, and run what waits a moment. */
export const settle = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
/** A moment: long enough for what the page does after it draws, such as a field taking the keyboard. */
export const moment = () => settle(40);

const send = async (el, event) => { el.dispatchEvent(event); await settle(); return event; };
const PointerLike = globalThis.PointerEvent ?? MouseEvent;
/** Events as a person makes them; each waits for the page to draw again. A change sets the field's value first. */
export const fireEvent = {
  click: (el, init = {}) => send(el, new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init })),
  pointerDown: (el, init = {}) => send(el, new PointerLike("pointerdown", { bubbles: true, cancelable: true, ...init })),
  keyDown: (el, init = {}) => send(el, new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })),
  focusIn: el => send(el, new FocusEvent("focusin", { bubbles: true })),
  submit: el => send(el, new Event("submit", { bubbles: true, cancelable: true })),
  focus: async el => { el.focus(); await settle(); },
  async change(el, { target = {} } = {}) {
    Object.assign(el, target);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return send(el, new Event("change", { bubbles: true }));
  },
};

const drawn = [];
/** Draws the page at `path`, as a host does, and returns its handle. Options pass to `mount`. */
export async function render(path = "/apps/access/", options = {}) {
  window.history.replaceState(null, "", path);
  const element = document.body.appendChild(document.createElement("div"));
  const handle = mount(element, { leave: vi.fn(), ...options });
  drawn.push({ element, handle });
  await settle();
  return handle;
}
/** Draws one part of the page, as the page holds it: with the API client and an address. Returns the box it is in. */
export async function renderPart(part, { path = "/apps/access/", appTitle = id => id, leave = vi.fn() } = {}) {
  window.history.replaceState(null, "", path);
  const element = document.body.appendChild(document.createElement("div"));
  draw(html`<${Screen.Provider} value=${{ api: client(), appTitle }}><${Router} leave=${leave}>${part}<//><//>`, element);
  drawn.push({ element, handle: { unmount: () => draw(null, element) } });
  await settle();
  return element;
}
/** Removes every page drawn, and anything it left at the end of the body. */
export function cleanup() {
  for (const { element, handle } of drawn.splice(0)) { handle.unmount(); element.remove(); }
  document.body.replaceChildren();
}
/** Where the page is now. */
export const where = () => window.location.pathname;
/** Goes Back, as the browser's button does, and lets the page answer. */
export async function back() { window.history.back(); await settle(20); }
