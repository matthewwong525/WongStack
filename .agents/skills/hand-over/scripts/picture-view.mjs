// The site page's picture on the private form and the password page: a thumbnail that opens full screen, where
// pinch, + and −, and drag zoom and move around it. Each page's HTML loads it first; the page calls `pictureView`.

export const ZOOMS = [1, 1.5, 2, 3, 4];
const [FIT, MOST] = [ZOOMS[0], ZOOMS.at(-1)];

/** The zoom one step in or out from `scale`, between fitting the width (1) and 4×. */
export function stepZoom(scale, zoomIn) {
  return zoomIn ? (ZOOMS.find(zoom => zoom > scale) ?? MOST) : (ZOOMS.findLast(zoom => zoom < scale) ?? FIT);
}

/** A pinch's zoom, held between fitting the width and 4×. */
export const clampZoom = scale => Math.min(MOST, Math.max(FIT, scale));

/** The scroll that keeps the point `at` pixels into the view where it is while the zoom goes `from` to `to`. */
export const keepPoint = (scroll, at, from, to) => Math.max(0, ((scroll + at) * to) / from - at);

/** Draws the picture at `url` into `slot`: a thumbnail with `caption`, and a full-screen view it opens. */
export function pictureView(slot, url, caption) {
  const make = (tag, props) => Object.assign(document.createElement(tag), props);
  const thumb = make('button', { type: 'button', className: 'picture-thumb' });
  thumb.append(make('img', { src: url, alt: 'The site\'s page' }), make('span', { className: 'hint', textContent: caption }));
  const [zoomOut, zoomIn, close] = [['−', 'Zoom out'], ['+', 'Zoom in'], ['Close', '']].map(([text, label]) => {
    const button = make('button', { type: 'button', textContent: text });
    if (label) button.setAttribute('aria-label', label);
    return button;
  });
  const bar = make('div', { className: 'picture-bar' });
  bar.append(make('span', { textContent: 'The site\'s page' }), zoomOut, zoomIn, close);
  const big = make('img', { src: url, alt: 'The site\'s page, full size', draggable: false });
  const stage = make('div', { className: 'picture-stage' });
  stage.append(big);
  const full = make('dialog', { className: 'picture-full' });
  full.setAttribute('aria-label', 'The site\'s page');
  full.append(bar, stage, make('p', { className: 'hint', textContent: 'Pinch or use + and − to zoom; drag to move around.' }));

  let scale = FIT;
  // A zoom holds still the point at `x`, `y` in the view: its centre for + and −, the fingers' midpoint for a pinch.
  const zoom = (next, x = stage.clientWidth / 2, y = stage.clientHeight / 2) => {
    const [left, top] = [keepPoint(stage.scrollLeft, x, scale, next), keepPoint(stage.scrollTop, y, scale, next)];
    scale = next;
    big.style.width = `${scale * 100}%`;
    [stage.scrollLeft, stage.scrollTop] = [left, top];
    zoomOut.disabled = scale <= FIT;
    zoomIn.disabled = scale >= MOST;
  };
  thumb.addEventListener('click', () => {
    zoom(FIT);
    [stage.scrollLeft, stage.scrollTop] = [0, 0];
    full.showModal();
  });
  zoomOut.addEventListener('click', () => zoom(stepZoom(scale, false)));
  zoomIn.addEventListener('click', () => zoom(stepZoom(scale, true)));
  close.addEventListener('click', () => full.close());
  // Close and Escape both end in `close`.
  full.addEventListener('close', () => thumb.focus());

  // One finger or a mouse drags the picture; two fingers pinch it, from the zoom and gap they started at.
  const points = new Map();
  let pinch = null;
  const gap = () => { const [a, b] = [...points.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  stage.addEventListener('pointerdown', event => {
    stage.setPointerCapture?.(event.pointerId);
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size === 2) pinch = { gap: gap(), scale };
  });
  stage.addEventListener('pointermove', event => {
    const was = points.get(event.pointerId);
    if (!was) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && points.size === 2) {
      const [[a, b], box] = [[...points.values()], stage.getBoundingClientRect()];
      return zoom(clampZoom((pinch.scale * gap()) / pinch.gap), (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top);
    }
    stage.scrollLeft -= event.clientX - was.x;
    stage.scrollTop -= event.clientY - was.y;
  });
  for (const type of ['pointerup', 'pointercancel']) stage.addEventListener(type, event => { points.delete(event.pointerId); pinch = null; });

  zoom(FIT);
  slot.replaceChildren(thumb, full);
  slot.hidden = false;
}

globalThis.pictureView = pictureView;
