export function computeLineCostLocal({
  unitPriceLocal,
  unitPricePerMeter,
  consumption,
  vatRefund,
  vatPercent,
}) {
  const price = unitPriceLocal ?? unitPricePerMeter ?? 0;
  const cons = consumption ?? 0;
  const vat = vatPercent ?? 0;
  const base = Number(price) * Number(cons);
  if (!vatRefund) return base;
  return base / (1 + Number(vat) / 100);
}

export function computeLineCostQuoted({ costLocal, exchangeRate }) {
  const rate = Number(exchangeRate) || 1;
  return Number(costLocal || 0) / rate;
}

export function normalizeLines(lines, defaultExchangeRate = 1) {
  if (!Array.isArray(lines)) return [];
  return lines
    .filter(Boolean)
    .map((l) => {
      const exchangeRate = l.exchangeRate != null ? Number(l.exchangeRate) : Number(defaultExchangeRate) || 1;
      const costLocal = computeLineCostLocal({
        unitPriceLocal: l.unitPriceLocal != null ? Number(l.unitPriceLocal) : null,
        unitPricePerMeter: l.unitPricePerMeter != null ? Number(l.unitPricePerMeter) : null,
        consumption: l.consumption != null ? Number(l.consumption) : 0,
        vatRefund: !!l.vatRefund,
        vatPercent: l.vatPercent != null ? Number(l.vatPercent) : 0,
      });
      const costQuoted = computeLineCostQuoted({ costLocal, exchangeRate });
      return {
        materialId: l.materialId || null,
        name: l.name || '',
        unitPriceLocal: l.unitPriceLocal != null ? Number(l.unitPriceLocal) : null,
        unitPricePerMeter: l.unitPricePerMeter != null ? Number(l.unitPricePerMeter) : null,
        consumption: l.consumption != null ? Number(l.consumption) : 0,
        vatRefund: !!l.vatRefund,
        vatPercent: l.vatPercent != null ? Number(l.vatPercent) : 0,
        exchangeRate,
        costLocal,
        costQuoted,
      };
    });
}

export function sumLinesLocal(lines) {
  return normalizeLines(lines).reduce((sum, l) => sum + l.costLocal, 0);
}

export function sumLinesQuoted(lines) {
  return normalizeLines(lines).reduce((sum, l) => sum + l.costQuoted, 0);
}

export function computeSellingPrice(totalCostQuoted, agentCommPercent, targetMarginPercent) {
  const comm = Number(agentCommPercent) || 0;
  const margin = Number(targetMarginPercent) || 0;
  const costWithComm = totalCostQuoted * (1 + comm / 100);
  if (margin >= 100) return costWithComm;
  return costWithComm / (1 - margin / 100);
}
