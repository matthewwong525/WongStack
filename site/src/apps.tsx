// "Tools you can build": sample copies of three Claymoo admin screens,
// laid out as the real ones are (read 2026-09-27), in gray. Every name,
// number, and address is invented; each runs in the page and sends and saves
// nothing.
import { useState, type ReactNode } from "react";
import { Table } from "./Table";

/** Cents as the sample screens show them: "$13.50". */
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** A row of pills or tabs, one pressed at a time. */
export function Chips({ names, pressed, onPress }: { names: string[]; pressed: number; onPress: (i: number) => void }) {
  return (
    <p className="chips">
      {names.map((name, i) => (
        <button key={name} aria-pressed={i === pressed} onClick={() => onPress(i)}>
          {name}
        </button>
      ))}
    </p>
  );
}

/** A gray outline badge, or a near-black one for a finished state. */
const Badge = ({ dark, children }: { dark?: boolean; children: ReactNode }) => (
  <span className={dark ? "badge badge-dark" : "badge"}>{children}</span>
);

/** The real app's frame: its header, then the screen's centered title. */
function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="admin">
      <p className="admin-head">
        <span className="admin-mark" aria-hidden="true">
          C
        </span>
        <b>Claymoo Admin</b>
        <span>Docs</span>
        <span>Sign out</span>
      </p>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

const Back = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <button className="admin-back" onClick={onPress}>
    ← {label}
  </button>
);

type Order = { id: string; by: string; express?: boolean; items: [title: string, sku: string, qty: number][]; to: string; kg: number };

const ORDERS: Order[] = [
  { id: "#1041", by: "Today", express: true, items: [["Cow clay kit", "CK-COW", 1], ["Sculpting tools", "TL-SCULPT", 1]], to: "Toronto, ON", kg: 0.8 },
  { id: "#1042", by: "Today", items: [["Frog clay kit", "CK-FROG", 2]], to: "Austin, TX", kg: 1.1 },
  { id: "#1043", by: "Tomorrow", items: [["Mushroom clay kit", "CK-MUSH", 1]], to: "Vancouver, BC", kg: 0.5 },
];

const units = (order: Order) => order.items.reduce((sum, [, , qty]) => sum + qty, 0);

/** One order: press each item to scan a unit; "Complete" once all are scanned. */
function PackOrder({ order, onBack, onComplete }: { order: Order; onBack: () => void; onComplete: () => void }) {
  const [scanned, setScanned] = useState(order.items.map(() => 0));
  const total = units(order);
  const done = scanned.reduce((sum, n) => sum + n, 0);
  const scan = (i: number) => setScanned(scanned.map((n, j) => (j === i ? n + 1 : n)));

  return (
    <>
      <Back label="Order list" onPress={onBack} />
      <p className="admin-title">
        <b>{order.id}</b> <Badge>Scanned: {`${done}/${total}`}</Badge> <Badge>{total - done} remaining</Badge>
      </p>
      <div className="pack-order">
        <div className="pack-items">
          {order.items.map(([title, sku, qty], i) => {
            const full = scanned[i] === qty;
            return (
              <button
                key={sku}
                className={full ? "pack-item pack-done" : "pack-item"}
                aria-label={`Scan ${title}: ${scanned[i]} of ${qty}`}
                disabled={full}
                onClick={() => scan(i)}
              >
                <i aria-hidden="true" />
                <span>
                  <b>{title}</b> SKU: {sku}
                </span>
                <strong>
                  {`${scanned[i]}/${qty}`}
                  {full && " ✓"}
                </strong>
              </button>
            );
          })}
        </div>
        <div className="card pack-side">
          <p className="note">Ship to</p>
          <p>{order.to}</p>
          <p className="note">Total weight</p>
          <p>{order.kg} kg</p>
          <button className="button" disabled={done < total} onClick={onComplete}>
            Complete
          </button>
        </div>
      </div>
    </>
  );
}

const FILTERS: [string, (packed: boolean) => boolean][] = [
  ["To Pack", (packed) => !packed],
  ["Packed", (packed) => packed],
  ["All", () => true],
];

function PackStation() {
  const [packed, setPacked] = useState(() => new Set<string>());
  const [filter, setFilter] = useState(2);
  const [open, setOpen] = useState<Order>();
  const isPacked = (order: Order) => packed.has(order.id);
  const next = ORDERS.find((order) => !isPacked(order));
  const keep = (i: number) => ORDERS.filter((order) => (FILTERS[i] as (typeof FILTERS)[number])[1](isPacked(order)));
  const complete = (order: Order) => {
    setPacked(new Set([...packed, order.id]));
    setOpen(undefined);
  };

  return (
    <AdminShell title="Pack Station">
      {open ? (
        <PackOrder order={open} onBack={() => setOpen(undefined)} onComplete={() => complete(open)} />
      ) : (
        <>
          <p className="admin-tabs">
            <b>Pack</b>
            <span>Flagged Orders</span>
          </p>
          <p className="admin-toolbar">
            <input aria-label="Scan packing slip" placeholder="Scan packing slip…" readOnly />
            <button className="button" disabled={!next} onClick={() => setOpen(next)}>
              Start Packing
            </button>
          </p>
          <Chips names={FILTERS.map(([name], i) => `${name} (${keep(i).length})`)} pressed={filter} onPress={setFilter} />
          <Table
            className="pack-table"
            head={["Order #", "Pack by", "Items", "Delivery", "Status"]}
            rows={keep(filter).map((order) => [
              isPacked(order) ? order.id : <button key={`order-${order.id}`} onClick={() => setOpen(order)}>{order.id}</button>,
              order.by,
              units(order),
              order.express ? "Express" : "Standard",
              <Badge key={`status-${order.id}`} dark={isPacked(order)}>{isPacked(order) ? "Packed" : "To pack"}</Badge>,
            ])}
          />
        </>
      )}
    </AdminShell>
  );
}

// Per-kit amounts in cents; margins in thousands of dollars, October to March.
const CHANNELS = [
  { name: "Shopify DTC", price: 4800, product: 1150, shipping: 900, ads: 1400, margins: [9.1, 10.2, 14.8, 11, 9.7, 12.4] },
  { name: "Faire", price: 2600, product: 1150, shipping: 300, ads: 0, margins: [2.1, 2.6, 3.9, 1.8, 2, 2.4] },
  { name: "Amazon", price: 4400, product: 1150, shipping: 1550, ads: 600, margins: [1.2, 1.5, 2.6, 1.4, 1.3, 1.6] },
];

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

/** Profit by channel: one channel's margin bars, per-kit tiles, and cost lines. */
function Profit() {
  const [open, setOpen] = useState(0);
  const { name, price, product, shipping, ads, margins } = CHANNELS[open] as (typeof CHANNELS)[number];
  const profit = price - product - shipping - ads;
  const cac = price - product - shipping;
  const top = Math.max(...margins);
  const tiles = [
    ["Unit cost", dollars(price - profit)],
    ["Profit / kit", dollars(profit)],
    ["Margin", `${Math.round((profit / price) * 100)}%`],
    ["Breakeven CAC", dollars(cac)],
    ["Breakeven ROAS", `${(price / cac).toFixed(2)}x`],
  ];
  const lines: [string, number][] = [
    ["Price", price],
    ["Product cost", product],
    ["Shipping + fees", shipping],
    ["Ads", ads],
    ["Profit", profit],
  ];

  return (
    <AdminShell title="Profit by channel">
      <p className="note">Mar 2026</p>
      <Chips names={CHANNELS.map((channel) => channel.name)} pressed={open} onPress={setOpen} />
      <div className="card">
        <h4>Contribution margin — last 6 months</h4>
        <ol className="admin-bars">
          {margins.map((margin, i) => (
            <li key={MONTHS[i]}>
              <span>
                <i aria-hidden="true" style={{ height: `${Math.round((margin / top) * 100)}%` }} />
              </span>
              <b>${margin.toFixed(1)}k</b>
              {MONTHS[i]}
            </li>
          ))}
        </ol>
      </div>
      <div className="card">
        <h4>{name} · Mar 2026</h4>
        <dl className="admin-tiles">
          {tiles.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <Table head={["Line", "$ / kit"]} rows={lines.map(([line, cents]) => [line, dollars(cents)])} />
      </div>
    </AdminShell>
  );
}

const FORMATS = ["All formats", "Video", "Static"];

const BRIEFS = [
  { name: "Frog kit hook test", state: "Approved", format: "Video", items: "3 variants" },
  { name: "Holiday bundle", state: "Archived", format: "Static", items: "1 design" },
];

const SPRING = "Spring kit · static";

const MARKERS = [
  ["Headline", "Your first clay figure tonight", "Make a frog in 20 minutes"],
  ["Primary text", "Everything in one box.", "No kiln. No mess."],
];

/** The static brief: notes, a reference picture with numbered markers, and the marker grid. */
function BriefDetail({ state, onBack, onApprove }: { state: string; onBack: () => void; onApprove: () => void }) {
  const [markers, setMarkers] = useState(MARKERS);
  const approved = state === "Approved";

  return (
    <>
      <Back label="Briefs" onPress={onBack} />
      <p className="admin-title">
        <b>{SPRING}</b> <Badge>Static</Badge> <Badge dark={approved}>{state}</Badge>
      </p>
      <p className="note">2 designs · revision 1</p>
      <div className="card">
        <h4>Notes</h4>
        <textarea aria-label="Notes" defaultValue="Warm light. Show hands, not faces." />
      </div>
      <div className="card">
        <h4>Variations</h4>
        <div className="brief-variations">
          <p className="brief-picture" role="img" aria-label={`Reference picture with ${markers.length} numbered markers`}>
            {markers.map((_, i) => (
              <b key={i}>{i + 1}</b>
            ))}
          </p>
          <Table
            head={["Marker", "Variation A", "Variation B"]}
            rows={markers.map(([label, a, b], i) => [
              <>
                <b>{i + 1}</b> {label}
              </>,
              a,
              b,
            ])}
          />
        </div>
        <button className="admin-back" onClick={() => setMarkers([...markers, ["", "—", "—"]])}>
          + Add marker
        </button>
      </div>
      <p className="brief-bar">
        {approved && <span>Queued in Meta Publish · Facebook and Instagram</span>}
        <button className="button" disabled={approved} onClick={onApprove}>
          Approve
        </button>
      </p>
    </>
  );
}

function Briefs() {
  const [format, setFormat] = useState(0);
  const [open, setOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const state = approved ? "Approved" : "Draft";
  const briefs = [{ name: SPRING, state, format: "Static", items: "2 designs" }, ...BRIEFS].filter(
    (brief) => format === 0 || brief.format === FORMATS[format],
  );

  return (
    <AdminShell title={open ? "Static ad brief" : "Ad briefs"}>
      {open ? (
        <BriefDetail state={state} onBack={() => setOpen(false)} onApprove={() => setApproved(true)} />
      ) : (
        <>
          <Chips names={FORMATS} pressed={format} onPress={setFormat} />
          <Table
            head={["Brief", "State", "Format", "Items"]}
            rows={briefs.map((brief) => [
              brief.name === SPRING ? <button key={`brief-${brief.name}`} onClick={() => setOpen(true)}>{brief.name}</button> : brief.name,
              <Badge key={`state-${brief.name}`} dark={brief.state === "Approved"}>{brief.state}</Badge>,
              brief.format,
              brief.items,
            ])}
          />
        </>
      )}
    </AdminShell>
  );
}

const APPS = [
  { name: "Pack Station", path: "pack-station", use: "Scan each item before marking an order packed.", Screen: PackStation },
  {
    name: "Profit by channel",
    path: "monthly-actuals",
    use: "See each channel's profit after product, shipping, and ad costs.",
    Screen: Profit,
  },
  {
    name: "Ad briefs",
    path: "briefs",
    use: "Keep notes and variations together, then approve an ad for the publish queue.",
    Screen: Briefs,
  },
];

/** "Tools you can build": one pill per app, the pressed one in a browser window. */
export function YourApps({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(0);
  const { name, path, use, Screen } = APPS[open] as (typeof APPS)[number];
  return (
    <section className={embedded ? "apps app-showcase" : "band band-shade apps"} aria-label={embedded ? "Tools you can build" : undefined}>
      {embedded ? <h3 className="demo-label">Examples you can build</h3> : (
        <>
          <h2>Tools you can build</h2>
          <p className="lede">Build around your own workflow. Try these examples.</p>
        </>
      )}
      <Chips names={APPS.map((app) => app.name)} pressed={open} onPress={setOpen} />
      <p className="lede">
        <b>{name}.</b> {use}
      </p>
      <section className="browser" aria-label={`${name} app, sample data`}>
        <p className="browser-bar">
          <i />
          <i />
          <i />
          <span>your-app.your-name.workers.dev/{path}</span>
        </p>
        {embedded ? <div key={name} className="example-scroll" role="region" aria-label={`${name} example contents`} tabIndex={0}><Screen /></div> : <Screen />}
      </section>
      <p className="note">Sample data. Nothing is saved.</p>
    </section>
  );
}
