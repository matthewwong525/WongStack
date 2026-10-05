// Three things the ready-made parts ask of a browser that the test DOM does not have: holding the pointer,
// scrolling a part into view, and watching a part's size. Each is stood in with nothing, for tests that draw a page.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.scrollIntoView ??= () => {}
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }
}
