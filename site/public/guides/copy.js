// Adds a Copy button to each code box on a guide page. The page reads the same without it, so an agent loses nothing.
for (const pre of document.querySelectorAll(".guide pre")) {
  const box = document.createElement("div");
  box.className = "code";
  pre.replaceWith(box);
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Copy";
  box.append(pre, button);
  button.addEventListener("click", () =>
    navigator.clipboard.writeText(pre.textContent.trimEnd()).then(
      () => {
        button.textContent = "Copied";
        setTimeout(() => (button.textContent = "Copy"), 2000);
      },
      () => {
        getSelection().selectAllChildren(pre);
        button.textContent = "Select and copy";
      },
    ),
  );
}
