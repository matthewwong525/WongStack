import { CHECKED, KINDS, PRODUCTS, type Mark } from "./compare";

// The chart after the example: which of the three each product's own pages say it keeps. The marks and their
// sources live in compare.ts.

const SAYS: Record<Mark, [string, string]> = {
  yes: ["✓", "Yes"],
  "not-stated": ["–", "Not stated"],
};

/** Each row's slide color, in KINDS's order: index.css's .data, .processes and .reasons. */
const COLORS = ["data", "processes", "reasons"];

/** The products other than WongStack, named in the note under the chart. */
const OTHERS = PRODUCTS.slice(1).map(({ name }) => name);

export function Compare() {
  return (
    <section className="band compare-section" aria-labelledby="compare-heading">
      <h2 id="compare-heading">What each tool says it keeps.</h2>
      <p className="lede">From each product's own help pages.</p>
      <div className="compare-scroll" role="region" aria-labelledby="compare-heading" tabIndex={0}>
        <table className="compare">
          <thead>
            <tr>
              <td />
              {PRODUCTS.map(({ name, logo }) => (
                <th scope="col" key={name}>
                  <img src={logo} alt="" width={20} height={20} />
                  <span>{name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KINDS.map((kind, k) => (
              <tr key={kind} className={COLORS[k]}>
                <th scope="row">
                  <strong>{kind.split(", ")[0]}</strong>, {kind.split(", ").slice(1).join(", ")}
                </th>
                {PRODUCTS.map(({ name, marks }) => {
                  const [sign, words] = SAYS[marks[k] as Mark];
                  return (
                    <td key={name} className={marks[k]}>
                      <span aria-hidden="true">{sign}</span>
                      <span className="sr-only">{words}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">✓ their own pages say so · – not stated</p>
      <p className="note">
        Checked {CHECKED}. {OTHERS.slice(0, -1).join(", ")}, and {OTHERS.at(-1)} belong to their makers. WongStack is
        not affiliated with them.
      </p>
    </section>
  );
}
