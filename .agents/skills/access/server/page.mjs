// The Access page's own HTML, answered by `serve()` at every address under the page's path that names no file, so a
// reload deep in Access opens it. The app serves the screen/ folder's files at that same path.

/** A path the page and the API live under: it starts and ends with `/`, and holds nothing to escape. */
export const PATH = /^\/(?:[\w-]+\/)*$/;

/** Whether `path`, under the page's path, names one of the screen/ folder's files rather than a view. */
export const namesFile = path => /\.(?:mjs|css)$/.test(path);

/** The page for one address: its files are under `page`, and it asks the Access API at `api`. */
export const pageHtml = (page, api) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Access</title>
    <base href="${page}" />
    <link rel="stylesheet" href="access.css" />
  </head>
  <body>
    <main id="access" data-api="${api}"></main>
    <script type="module">
      const { mount } = await import(new URL("main.mjs", document.baseURI));

      const element = document.getElementById("access");
      mount(element, { base: element.dataset.api, home: new URL(".", document.baseURI).pathname });
    </script>
  </body>
</html>
`;
