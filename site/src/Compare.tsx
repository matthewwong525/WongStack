import { CHECKED, CHECKLIST, PRODUCTS } from "./compare";
import { InstallButton } from "./InstallButton";

const Mark = ({ yes }: { yes: boolean }) => (
  <span role="img" aria-label={yes ? "Yes" : "No"}>
    {yes ? "✓" : "–"}
  </span>
);

export function Compare() {
  return (
    <section className="band">
      <h2>How WongStack compares</h2>
      <ul className="legend">
        {PRODUCTS.map(({ name, logo }) => (
          <li key={name}>
            <img src={logo} alt="" />
            {name}
          </li>
        ))}
      </ul>
      <table className="compare">
        <thead>
          <tr>
            <td />
            {PRODUCTS.map(({ name, logo }) => (
              <th scope="col" key={name}>
                <img src={logo} alt={name} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CHECKLIST.map((feature, f) => (
            <tr key={feature}>
              <th scope="row">{feature}</th>
              {PRODUCTS.map(({ name, marks }) => (
                <td key={name}>
                  <Mark yes={marks[f] as boolean} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        Checked {CHECKED}. ✓ yes · – no or not stated. Grok Bot, Muse, OpenClaw, and Lovable belong to their makers.
        WongStack is not affiliated with them.
      </p>
      <InstallButton />
    </section>
  );
}
