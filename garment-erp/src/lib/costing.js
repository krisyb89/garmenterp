// src/lib/costing.js

export function computeLineCostLocal({
  unitPricePerMeter,
  unitPriceLocal,
  consumption,
  vatRefund,
  vatPercent,
}) {
  const price = unitPricePerMeter ?? unitPriceLocal ?? 0;
  const cons = consumption ?? 0;
  const vat = vatPercent ?? 0;
  const base = Number(price) * Number(cons);
  if (!vatRefund) return base;
  return base / (1 + Number(vat) / 100);
}

export function normalizeLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .filter(Boolean)
    .map((l) => ({
      materialId: l.materialId || null,
      name: l.name || '',
      unitPricePerMeter: l.unitPricePerMeter != null ? Number(l.unitPricePerMeter) : null,
      unitPriceLocal: l.unitPriceLocal != null ? Number(l.unitPriceLocal) : null,
      consumption: l.consumption != null ? Number(l.consumption) : 0,
      vatRefund: !!l.vatRefund,
      vatPercent: l.vatPercent != null ? Number(l.vatPercent) : 0,
      _computedCostLocal: l._computedCostLocal != null ? Number(l._computedCostLocal) : null,
    }));
}

export function sumLines(lines) {
  return normalizeLines(lines).reduce((sum, l) => sum + computeLineCostLocal(l), 0);
}
