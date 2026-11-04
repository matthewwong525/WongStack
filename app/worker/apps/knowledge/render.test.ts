import { expect, it } from "vitest";
import { PAGES } from "../../../tests/knowledge";
import { frontmatter, render, titleOf } from "./render";

const refunds = PAGES["how-we-work/refunds.md"];
const app = (markdown: string, path = "how-we-work/refunds.md") => render(markdown, path, "app").html;
const pub = (markdown: string, path = "how-we-work/refunds.md") => render(markdown, path, "public").html;

it("reads a bare public: true in the leading frontmatter alone, and takes the frontmatter off the body", () => {
  expect(frontmatter("---\npublic: true\n---\n# Hi\n")).toEqual({ isPublic: true, body: "# Hi\n" });
  expect(frontmatter("---\r\ntitle: x\r\n  public: true  \r\n---")).toEqual({ isPublic: true, body: "" });
  for (const text of ["---\npublic: \"true\"\n---\n", "---\npublic: false\n---\n", "# Hi\n\npublic: true\n", "---\npublic: true\n"]) {
    expect(frontmatter(text).isPublic, text).toBe(false);
  }
  expect(frontmatter("# Hi\n").body).toBe("# Hi\n");
});

it("titles a page by its first # line, else by its address's last part", () => {
  expect(titleOf("intro\n# The **refund** rule ##\n# Second", "a/b.md")).toBe("The refund rule");
  expect(titleOf("## Only a subheading", "how-we-work/shipping-cut-off.md")).toBe("shipping-cut-off");
  expect(titleOf("", "people/README.md")).toBe("people");
  expect(titleOf("", "README.md")).toBe("README");
});

it("never lets a page's content run code: raw HTML is text, and unsafe links and pictures are text", () => {
  const html = app(refunds);
  expect(html).not.toMatch(/<script|<img src=x|javascript:|<svg|logo\.svg/);
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).toContain("click");
  expect(app("[a](data:text/html,x) ![b](vbscript:x) [c](JAVASCRIPT:x)")).toBe("<p>a b c</p>\n");
  // Every attribute is quoted and escaped.
  expect(app('[a](https://example.com/?q="x" "Say \\"hi\\"")')).toBe(
    '<p><a href="https://example.com/?q=&quot;x&quot;" title="Say &quot;hi&quot;">a</a></p>\n');
});

it("keeps web, mail and anchor links, and rewrites page links for the app or the public address", () => {
  expect(app("[w](https://example.com) [h](http://example.com) [m](mailto:a@example.com) [s](#refunds)")).toBe(
    '<p><a href="https://example.com">w</a> <a href="http://example.com">h</a> <a href="mailto:a@example.com">m</a> <a href="#refunds">s</a></p>\n');
  const links = "[a](../people/sam-lee.md#who) [b](../people/README.md) [c](./holiday%20hours.md) [d](/welcome.md) [e](../people/)";
  expect(app(links)).toBe('<p><a href="/apps/knowledge/people/sam-lee#who">a</a> <a href="/apps/knowledge/people">b</a> ' +
    '<a href="/apps/knowledge/how-we-work/holiday%20hours">c</a> <a href="/apps/knowledge/welcome">d</a> <a href="/apps/knowledge/people">e</a></p>\n');
  expect(pub(links)).toContain('<a href="/public/people/sam-lee#who">a</a>');
});

it("shows a link out of the repository, or one it can not read, as plain text", () => {
  expect(app("[wiki](../../wiki/stack/company-knowledge.md) [bad](%E0%A4%A.md)")).toBe("<p>wiki bad</p>\n");
});

it("links other files through the app's file route, and only in the app", () => {
  expect(app("[sheet](prices.csv)")).toBe('<p><a href="/apps/knowledge/api/file?path=how-we-work%2Fprices.csv">sheet</a></p>\n');
  expect(pub("[sheet](prices.csv)")).toBe("<p>sheet</p>\n");
});

it("shows pictures in the app and their alt text on the public address", () => {
  expect(app("![Chart](chart.png) ![Web](https://example.com/a.png)")).toBe('<p><img src="/apps/knowledge/api/file?path=how-we-work%2Fchart.png" ' +
    'alt="Chart"> <img src="https://example.com/a.png" alt="Web"></p>\n');
  expect(app("![Page](other.md) ![Mail](mailto:a@example.com)")).toBe("<p>Page Mail</p>\n");
  expect(pub("![Chart](chart.png) ![Web](https://example.com/a.png)")).toBe("<p>Chart Web</p>\n");
});

it("marks a diagram for drawing, keeps other code as code, and gives headings their anchors", () => {
  const html = app(refunds);
  expect(html).toContain('<pre class="mermaid">flowchart TD\n  ask --&gt; refund</pre>');
  expect(app("```js\nlet a = '<b>';\n```")).toBe('<pre><code class="language-js">let a = &#39;&lt;b&gt;&#39;;\n</code></pre>\n');
  expect(app("## Who does *what*, and why?")).toBe('<h2 id="who-does-what-and-why">Who does <em>what</em>, and why?</h2>\n');
  expect(render(refunds, "how-we-work/refunds.md", "app")).toMatchObject({ title: "Refunds", isPublic: false });
});
