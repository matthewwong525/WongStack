// The landing page's headline: "<name> but yours.", where the name
// slides up through the products a visitor already knows. The slide is pure
// CSS (`.rotator` in index.css); a screen reader reads the hidden sentence
// once, naming all three, and skips the moving rows.
const NAMES = [
  { name: "Grok Bot", logo: "/logos/grok.svg", brand: "grok" },
  { name: "Muse", logo: "/logos/meta.svg", brand: "muse" },
  { name: "Dots", logo: "/logos/openai.svg", brand: "dots" },
];

// The first name again at the end, so the loop back to it is seamless.
const ROWS = [...NAMES, NAMES[0]];

export function Rotator() {
  return (
    <h1 className="rotator">
      <span className="sr-only">Grok Bot, Muse, or Dots, but yours.</span>
      <span aria-hidden="true">
        <span className="rotator-window">
          <span className="rotator-rows">
            {ROWS.map(({ name, logo, brand }, i) => (
              <span className={`rotator-row rotator-${brand}`} key={i}>
                <img src={logo} alt="" />
                {name}
              </span>
            ))}
          </span>
        </span>
        <span>but yours.</span>
      </span>
    </h1>
  );
}
