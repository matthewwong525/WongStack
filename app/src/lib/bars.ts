/** Hides the app's top bar, lays it over the page, or shows it again: Layout's header hides while the root carries
 *  `data-bars="tucked"` and is fixed at the screen's top while it carries `data-bars="over"`. */
export function tuckBars(mode: 'tucked' | 'over' | null) {
  if (mode) document.documentElement.dataset.bars = mode
  else delete document.documentElement.dataset.bars
}
