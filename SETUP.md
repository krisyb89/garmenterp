# Production WIP Setup Guide

This guide covers the setup and deployment of the Production WIP feature with PO-line scoped approvals, slot-based buckets (Self/Contrast, Trim1/Trim2), and admin-configurable milestone columns.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
```bash
npx prisma migrate dev
npx prisma generate
```

This will apply all migrations including:
- `20260217140447_po_line_scoped_approvals` - Adds `poLineItemId` and `slot` to ApprovalRecord
- `20260217150000_production_wip_columns` - Adds PRODUCTION scope to WIPColumn and seeds default milestone columns
- `20260217160000_prevent_duplicate_approvals` - Adds unique constraint to prevent duplicate approval submissions

### 3. Create Admin User

You need at least one user with `role = 'ADMIN'` to access the WIP Column Config page.

**Option A: Update existing user**
```sql
-- Connect to your PostgreSQL database
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

**Option B: Create new admin user** (using Prisma Studio)
```bash
npx prisma studio
```
Then:
1. Open the `User` model
2. Create new record with `role = 'ADMIN'`
3. Set email and hashed password

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000/dashboard/wip/production

---

## 📋 What's New

### Architecture Changes

1. **PO-Line Scoped Approvals**
   - Approvals now have `poLineItemId` field
   - Each approval is tied to a specific PO line item, not just a style
   - This prevents the same style's approval from appearing on multiple POs incorrectly

2. **Slot-Based Buckets**
   - Added `ApprovalSlot` enum: `SELF`, `CONTRAST`, `TRIM_1`, `TRIM_2`
   - Deterministic mapping instead of guessing from notes
   - Enables clean reporting and prevents ambiguity

3. **Admin-Configurable Columns**
   - Milestone columns stored in `WIPColumn` table with `scope = 'PRODUCTION'`
   - Add/remove/rename approval & sample columns without code changes
   - Access via `/dashboard/admin/wip-columns` (Admin role required)

4. **Material Linking**
   - When submitting FABRIC/TRIM approvals from WIP, system prompts to select BOM material
   - Links approval to material for accurate reporting
   - Validation enforces materialId for slotted fabric/trim approvals

5. **Concurrency Protection**
   - Unique constraint prevents duplicate submissions
   - UI checks for existing approval before creating
   - Protects against race conditions when multiple users access same cell

---

## 🧪 Testing Checklist

After deployment, verify the following:

### Basic Flow
- [ ] Visit `/dashboard/wip/production`
- [ ] See list of PO line items with color-coded milestone cells
- [ ] Click empty approval cell (e.g., "Self Fabric")
- [ ] Popover appears with BOM material dropdown (for fabric/trim)
- [ ] Select material, click "Submit"
- [ ] Cell turns **yellow** (SUBMITTED status)

### Approval Flow
- [ ] Click yellow cell
- [ ] Click "Approve" button
- [ ] Cell turns **green** (APPROVED status)
- [ ] Approval date appears in cell

### Rejection Flow
- [ ] Click green cell
- [ ] Click "Reject" button
- [ ] Cell turns **red** (REJECTED status)

### Admin Configuration
- [ ] Login as ADMIN user
- [ ] See "Admin" section in sidebar
- [ ] Visit `/dashboard/admin/wip-columns`
- [ ] Change scope to "PRODUCTION"
- [ ] See default milestone columns (Fits, PP, TOP, Shipment, Lab Dip, Self Fabric, etc.)
- [ ] Try toggling `isActive` on a column
- [ ] Click "Save Changes"
- [ ] Return to Production WIP and verify column appears/disappears

### Concurrency Test
- [ ] Open Production WIP in two browser windows
- [ ] Click same empty cell in both windows simultaneously
- [ ] Only one submission should succeed
- [ ] Other window should refresh and show existing approval

---

## 🔧 Key Implementation Details

### Database Models

**ApprovalRecord** (updated)
```prisma
model ApprovalRecord {
  id              String         @id @default(uuid())
  styleId         String
  poLineItemId    String?        // NEW: PO-line scoping
  materialId      String?
  type            ApprovalType
  slot            ApprovalSlot?  // NEW: SELF/CONTRAST/TRIM_1/TRIM_2
  submissionNo    Int            @default(1)
  status          ApprovalStatus @default(PENDING)
  // ... other fields

  @@unique([poLineItemId, type, slot, materialId, submissionNo])
  @@index([poLineItemId, type, slot, materialId])
}
```

**POLineItem** (updated)
```prisma
model POLineItem {
  // ... existing fields
  approvals       ApprovalRecord[]  // NEW: back-relation
}
```

**WIPColumn** (extended)
```prisma
model WIPColumn {
  scope           WIPScope  // SRS, PO, PRODUCTION
  key             String
  label           String
  kind            String    // FIELD, SAMPLE, APPROVAL
  approvalType    ApprovalType?
  approvalSlot    ApprovalSlot?
  sampleStage     SampleStage?
  // ... other fields
}
```

### API Endpoints

**POST /api/approvals** (enhanced)
- Accepts `poLineItemId`, `slot`, `materialId`
- Auto-derives `styleId` from PO line if not provided
- Validates: FABRIC/TRIM with slot must have materialId
- Calculates submission number scoped by (poLineItemId, type, slot, materialId)

**GET /api/wip/production**
- Fetches PO line items with joined approvals at both PO-line and style level
- Prefers PO-line approvals, falls back to style-level for legacy data
- Returns flat rows with `approvalIndex` and `sampleIndex` for dynamic column rendering

**GET /api/wip/columns?scope=PRODUCTION**
- Returns active milestone columns for Production WIP
- Used by UI to render approval/sample columns dynamically

**GET /api/styles/[id]/bom**
- Returns BOM items with material details
- Used by WIP approval popover to show material picker

---

## 📊 Default Production WIP Columns

The migration seeds these default columns:

**Samples:**
- Fits (FIT stage)
- PP (PP stage)
- TOP (TOP stage)
- Shipment (SHIPMENT stage)

**Approvals:**
- Lab Dip (LAB_DIP)
- Self Fabric (FABRIC + SELF slot)
- Contrast (FABRIC + CONTRAST slot)
- Trim 1 (TRIM + TRIM_1 slot)
- Trim 2 (TRIM + TRIM_2 slot)
- S/O Print (PRINT_STRIKEOFF)
- S/O Emb (EMBROIDERY_STRIKEOFF)
- Wash (WASH)

You can add/remove/rename these via the Admin UI.

---

## 🐛 Troubleshooting

### Migration Fails
```
Error: Unique constraint failed
```
**Solution:** If you have existing data without unique poLineItemId/slot combinations, you may need to clean up duplicates first:
```sql
-- Check for duplicates
SELECT "poLineItemId", "type", "slot", "materialId", "submissionNo", COUNT(*)
FROM "approval_records"
WHERE "poLineItemId" IS NOT NULL
GROUP BY "poLineItemId", "type", "slot", "materialId", "submissionNo"
HAVING COUNT(*) > 1;
```

### CSS Not Applied
**Solution:** Clear Next.js cache and rebuild:
```bash
rm -rf .next
npm run dev
```

### Admin Section Not Visible
**Solution:** Verify your user has `role = 'ADMIN'`:
```sql
SELECT id, email, role FROM users WHERE email = 'your@email.com';
```

### Material Picker Shows No Options
**Solution:** Ensure the style has BOM items:
```sql
SELECT * FROM bom_items WHERE "styleId" = 'your-style-id';
```

### Approval Cell Won't Submit
**Solution:** Check browser console for validation errors. Common issues:
- Missing materialId for FABRIC/TRIM with slot
- Network error (check API is running)
- Duplicate approval already exists (refresh page)

---

## 🔄 Deployment to Production

1. **Backup Database** (important!)
   ```bash
   pg_dump your_database > backup_$(date +%Y%m%d).sql
   ```

2. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

3. **Verify Admin User**
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'admin@yourcompany.com';
   ```

4. **Build & Deploy**
   ```bash
   npm run build
   npm start
   ```

5. **Smoke Test**
   - Login as admin
   - Visit Production WIP
   - Create one test approval
   - Approve it
   - Verify cell turns green

---

## 📝 Notes

- **No Legacy Data**: This system is brand new, so the style-level fallback logic is dormant. All new approvals will be PO-line scoped.
- **Future-Proofing**: The fallback logic remains in place for flexibility, but won't be used unless you manually create style-level approvals.
- **Performance**: The index on `[poLineItemId, type, slot, materialId]` ensures fast lookups even with thousands of approvals.

---

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the browser console for errors
3. Check API responses in Network tab
4. Verify database schema matches expected state:
   ```bash
   npx prisma studio
   ```

For questions about architecture or design decisions, refer to the conversation history with Claude/ChatGPT where these features were designed.
