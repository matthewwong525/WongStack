// The tip math, apart from the page so the tests can run it.
// Money is kept in whole cents, so 0.1 + 0.2 rounding never shows up.

/**
 * @param {{ bill: number, percent: number, people: number }} input
 * @returns {{ tip: number, total: number, each: number } | { error: string }}
 */
export function split({ bill, percent, people }) {
	if (!Number.isFinite(bill) || bill < 0) return { error: "Enter the bill amount." };
	if (!Number.isFinite(percent) || percent < 0 || percent > 100) return { error: "Pick a tip from 0 to 100%." };
	if (!Number.isInteger(people) || people < 1) return { error: "At least one person pays." };
	const billCents = Math.round(bill * 100);
	const tipCents = Math.round((billCents * percent) / 100);
	const totalCents = billCents + tipCents;
	// Round each share up, so the people together never pay less than the total.
	const eachCents = Math.ceil(totalCents / people);
	return { tip: tipCents / 100, total: totalCents / 100, each: eachCents / 100 };
}
