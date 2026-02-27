// src/lib/serialize.js
// Recursively convert Prisma Decimal / BigInt values to plain JS numbers
// so NextResponse.json() serialises them correctly.
//
// Usage:  return NextResponse.json(toPlain(prismaResult));

export function toPlain(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  // Prisma Decimal (decimal.js) has .toFixed — convert to JS number
  if (typeof obj?.toFixed === 'function') return parseFloat(obj.toString());
  if (Array.isArray(obj)) return obj.map(toPlain);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = toPlain(v);
    return out;
  }
  return obj;
}
