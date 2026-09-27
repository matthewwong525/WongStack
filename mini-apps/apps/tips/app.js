// The page's script: reads the form and shows each person's share.
import { split } from "./tip.mjs";

const bill = document.getElementById("bill");
const people = document.getElementById("people");
const result = document.getElementById("result");
const buttons = [...document.querySelectorAll("[data-percent]")];
let percent = 15;
const money = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function show() {
	const out = split({ bill: Number(bill.value), percent, people: Number(people.value) });
	if (!bill.value || "error" in out) { result.textContent = out.error || "Enter the bill amount."; return; }
	result.innerHTML = "";
	const each = document.createElement("div");
	each.className = "each";
	each.textContent = `${money(out.each)} each`;
	const detail = document.createElement("div");
	detail.textContent = `Tip ${money(out.tip)} · Total ${money(out.total)}`;
	result.append(each, detail);
}
for (const b of buttons) b.addEventListener("click", () => {
	percent = Number(b.dataset.percent);
	for (const other of buttons) other.setAttribute("aria-pressed", String(other === b));
	show();
});
bill.addEventListener("input", show);
people.addEventListener("input", show);
