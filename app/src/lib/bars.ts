/** Hides the app's top bar, or shows it again: Layout's header hides while the root carries `data-bars="tucked"`. */
export function tuckBars(on: boolean) {
  if (on) document.documentElement.dataset.bars = 'tucked'
  else delete document.documentElement.dataset.bars
}
