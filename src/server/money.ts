import "server-only";

// Money on the server: UAH as a number with at most 2 decimals (the unit
// the UI types already use). Every product, sum and discount goes through
// round2, so 31.65 * 3 is 94.95 and not 94.94999999999999.

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineSum(price: number, qty: number): number {
  return round2(price * qty);
}

export function sum(values: number[]): number {
  return round2(values.reduce((total, v) => total + v, 0));
}

// Price after a percentage discount (the partner price from the wholesale
// list price).
export function discounted(price: number, percent: number): number {
  return round2(price * (1 - percent / 100));
}
