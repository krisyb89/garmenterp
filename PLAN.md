# Plan: Supplier PO Edit + Goods Receiving + P&L Auto-Sync

## Overview

Three connected features:
1. **Supplier PO editing** — edit header fields and line items on existing SPOs
2. **Goods Receiving with actual bill** — record what was actually received (qty + actual cost) against each SPO line
3. **P&L auto-sync** — actual costs from goods receiving automatically create/update OrderCost records, with manual override

---

## Feature 1: Supplier PO Editing

### API — `src/app/api/supplier-pos/[id]/route.js`

Expand the existing PUT handler to accept full edits (not just status/notes):

- Header fields: `supplierId`, `customerPOId`, `deliveryDate`, `currency`, `paymentTerms`, `notes`, `status`
- Line items: full replace strategy (delete existing lines → insert new ones), same pattern as Customer PO edit
- Recalculate `totalAmount` from line items on every save
- Only allow editing when status is DRAFT or ISSUED (not after goods have been received)

### Frontend — `src/app/(dashboard)/dashboard/supplier-pos/[id]/page.js`

Convert the read-only detail page into an editable form (following the same pattern as the Customer PO detail page `purchase-orders/[id]/page.js`):

- Editable header section: supplier (dropdown), linked customer PO (dropdown), delivery date, currency, payment terms, notes
- Editable line items table: material (combobox), color, qty, unit, unit price, VAT %, refundable checkbox — reuse the same `MaterialCombobox` component from the "new" page
- Add/remove line item buttons
- Auto-calculated gross total, VAT amount, net cost per line and totals
- "Save Changes" button with confirm step (same pattern as Customer PO page)
- Disable editing when status is PARTIALLY_RECEIVED or later (show a message)

---

## Feature 2: Goods Receiving with Actual Bill

### Schema — no migration needed

The existing `GoodsReceived` + `GoodsReceivedItem` models already have everything we need:
- `GoodsReceived`: `supplierPOId`, `receivedDate`, `receivedBy`, `location`, `notes`
- `GoodsReceivedItem`: `description`, `color`, `orderedQty`, `receivedQty`, `unit`, `qcResult`, `remarks`

We'll add two fields to `GoodsReceivedItem` for actual billing (requires `db push`):
- `actualUnitPrice Decimal?` — the unit price on the supplier's actual invoice
- `actualLineTotal Decimal?` — receivedQty × actualUnitPrice

### API — new route `src/app/api/supplier-pos/[id]/receive/route.js`

**POST** — Create a goods received record:
- Accepts: `receivedDate`, `receivedBy`, `location`, `notes`, `items[]`
- Each item: `description`, `color`, `orderedQty`, `receivedQty`, `unit`, `actualUnitPrice`, `qcResult`, `remarks`
- Calculates `actualLineTotal` = receivedQty × actualUnitPrice
- Creates GoodsReceived + GoodsReceivedItems in a transaction
- Auto-updates SPO status: if all lines fully received → FULLY_RECEIVED, otherwise PARTIALLY_RECEIVED
- **Auto-syncs to P&L** (see Feature 3 below)

### Frontend — Goods Receiving section on SPO detail page

Add a "Receive Goods" section below the existing "Goods Received" display:

- "Record Receipt" button that expands an inline form
- Pre-populates a table from the SPO line items with: material/description, color, ordered qty, unit
- User fills in: received qty, actual unit price (defaults to PO unit price), QC result, remarks
- Shows calculated actual line total per row
- Shows total actual bill amount vs. total PO amount (with variance highlighted)
- Submit creates the goods received record via the new API
- After submit, refresh the page data to show the new receipt in the history

---

## Feature 3: P&L Auto-Sync

### Logic — inside the goods receiving POST handler

When goods are received, automatically create an `OrderCost` record **only if the SPO is linked to a customer PO** (`customerPOId` is set):

- Category: determined by the supplier type (FABRIC_MILL → FABRIC, TRIM_SUPPLIER → TRIM, CMT_FACTORY → CMT, etc.)
- Description: auto-generated, e.g. "SPO-2026-0001 — Fabric Mill Co. (actual receipt)"
- `supplierName`: from the supplier record
- `totalCost`: sum of all `actualLineTotal` values from the receipt
- `currency`: from the SPO currency
- `exchangeRate`: defaults to 1 (user can manually adjust in OrderCost later)
- `totalCostBase`: totalCost × exchangeRate
- `supplierPORef`: the SPO number for traceability
- Source tracking: add a `source` field or use `notes` to mark as "AUTO_FROM_GR" so the UI can distinguish auto-synced costs from manual entries

### Manual override

- Auto-synced OrderCost records appear in the existing P&L table on the Customer PO detail page
- Users can still manually create OrderCost entries for costs that don't come from SPOs (freight, inspection, agent commission, etc.)
- If a user manually edits an auto-synced cost, it stays as-is (no re-sync on subsequent receipts for the same SPO)
- Multiple receipts against the same SPO create separate OrderCost records (one per receipt), not cumulative updates

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `actualUnitPrice` and `actualLineTotal` to GoodsReceivedItem |
| `src/app/api/supplier-pos/[id]/route.js` | Expand PUT for full edit |
| `src/app/api/supplier-pos/[id]/receive/route.js` | **New** — goods receiving POST with P&L sync |
| `src/app/(dashboard)/dashboard/supplier-pos/[id]/page.js` | Rewrite to editable form + goods receiving UI |
| `src/lib/serialize.js` | Already exists, reuse for Decimal handling |

No changes needed to `order-costs/route.js` or `order-pnl/page.js` — they already read from OrderCost and will pick up auto-synced records automatically.

### Schema change (run `npx prisma db push` after)

```prisma
model GoodsReceivedItem {
  ...existing fields...
  actualUnitPrice  Decimal?  // Actual unit price from supplier invoice
  actualLineTotal  Decimal?  // receivedQty × actualUnitPrice
}
```

---

## Implementation Order

1. Schema change + db push
2. SPO edit (API PUT + frontend)
3. Goods receiving API
4. Goods receiving frontend
5. P&L auto-sync (in the goods receiving API)
6. Test end-to-end: create SPO → edit it → receive goods → verify OrderCost appears on Customer PO P&L
