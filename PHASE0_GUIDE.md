# Phase 0: MVP Permissions - Implementation Guide

**Status:** ✅ Complete and Ready for Testing
**Date:** February 17, 2026
**Implementation Time:** 2 hours

---

## 🎯 What Phase 0 Includes

### **Simple, Production-Ready Security**

Phase 0 implements basic authorization and audit logging without blocking your Production WIP launch:

1. **Role-Based Access** - Simple 3-tier model
2. **Ownership Tracking** - Who created/modified each PO
3. **Basic Authorization** - Can only edit what you created (if in DRAFT)
4. **Audit Logging** - All changes tracked automatically
5. **30-Minute Edit Window** - Approvals can be edited for 30 min after creation

---

## 📋 Features Implemented

### 1. **Database Schema** ✅

**Added to `PurchaseOrder`:**
- `createdByUserId` - Tracks who created the PO
- `lastModifiedByUserId` - Tracks who last modified it

**Enhanced `ActivityLog`:**
- `beforeData` / `afterData` - Full audit trail
- `ipAddress` / `userAgent` - Request context

### 2. **Authorization Module** ✅

**Location:** `src/lib/authorization.js`

**Authorization Rules:**

| Role | Can Do |
|------|---------|
| **ADMIN** | Everything (full access) |
| **MERCHANDISER** | Create POs, edit own POs (if DRAFT), create/edit approvals |
| **Others** | Read-only for now |

**PO Edit Rules:**
- ✅ Can edit if: You created it AND it's in DRAFT status
- ⚠️ Warning if: PO is CONFIRMED (shows warning, suggests contacting admin)
- ❌ Blocked if: Someone else created it

**Approval Edit Rules:**
- ✅ Can edit within 30 minutes of creation
- ⚠️ Warning after 30 minutes (suggests contacting admin)

### 3. **Audit Logging** ✅

**Location:** `src/lib/audit.js`

**What Gets Logged:**
- All PO creates/updates
- All Approval creates/updates
- User who performed action
- Before/after state
- IP address + user agent
- Timestamp

**Query Functions:**
- `getAuditTrail(entity, entityId)` - Get history for a specific PO/Approval
- `getUserActivity(userId)` - Get all actions by a user
- `getAllActivity(filters)` - Admin view of all changes

### 4. **API Updates** ✅

**Updated Routes:**
- `POST /api/purchase-orders` - Sets `createdByUserId`, logs creation
- `PUT /api/purchase-orders/[id]` - Checks authorization, sets `lastModifiedByUserId`, logs update

**Authorization Flow:**
```javascript
// 1. Get current user
const user = await getCurrentUser();

// 2. Check permission
const authCheck = await checkPermission(user, 'update', 'PO', existingPO);
if (!authCheck.allowed) {
  return NextResponse.json({ error: authCheck.reason }, { status: 403 });
}

// 3. Perform action + log
await logPOChange(user, 'UPDATE', po.id, beforePO, po, request);
```

### 5. **Bootstrap Admin User** ✅

**Created automatically on first migration:**
- Email: `admin@garment-erp.local`
- Password: `admin123`
- Role: `ADMIN`

**⚠️ IMPORTANT:** Change this password immediately after first login!

---

## 🚀 How to Deploy

### **Step 1: Run Migration**

```bash
cd "/sessions/vibrant-upbeat-goodall/mnt/Garment ERP"

# If you have a database configured:
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate deploy

# Or if using migrate dev:
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate dev
```

This will:
- Add `createdByUserId` / `lastModifiedByUserId` to PurchaseOrder
- Enhance ActivityLog with audit fields
- Create bootstrap admin user

### **Step 2: Regenerate Prisma Client**

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```

### **Step 3: Start Server**

```bash
npm run dev
```

### **Step 4: Test Authorization**

1. **Login as admin:**
   - Email: `admin@garment-erp.local`
   - Password: `admin123`

2. **Create a test PO:**
   - Go to `/dashboard/purchase-orders/new`
   - Create a PO
   - Note: You should see your name as creator

3. **Try to edit:**
   - As creator + DRAFT status → ✅ Should work
   - Change status to CONFIRMED → Try to edit → ⚠️ Should show warning

4. **Test with another user:**
   - Create a second user (different email)
   - Login as that user
   - Try to edit the PO created by admin → ❌ Should be blocked

5. **Check audit log:**
   - All your actions should be logged in `activity_logs` table

---

## 🧪 Testing Checklist

### **Authorization Tests**

- [ ] Admin can create POs
- [ ] Admin can edit any PO (even confirmed)
- [ ] Merchandiser can create POs
- [ ] Merchandiser can edit own POs (if DRAFT)
- [ ] Merchandiser CANNOT edit other user's POs
- [ ] Warning shown when trying to edit CONFIRMED PO
- [ ] Approvals can be edited within 30 minutes
- [ ] Warning shown for approvals older than 30 minutes

### **Audit Log Tests**

- [ ] PO creation is logged
- [ ] PO update is logged with before/after data
- [ ] Audit log shows correct user
- [ ] Audit log has timestamp
- [ ] Can query audit trail for specific PO

### **UI Tests**

- [ ] Production WIP still works
- [ ] Approval submission still works
- [ ] No errors in console
- [ ] No broken pages

---

## 📊 Database Queries (For Testing)

### **Check Who Created POs**

```sql
SELECT
  po."poNo",
  po.status,
  creator.name as "createdBy",
  modifier.name as "lastModifiedBy",
  po."createdAt"
FROM purchase_orders po
LEFT JOIN users creator ON po."createdByUserId" = creator.id
LEFT JOIN users modifier ON po."lastModifiedByUserId" = modifier.id
ORDER BY po."createdAt" DESC
LIMIT 10;
```

### **View Audit Log**

```sql
SELECT
  al.action,
  al.entity,
  al."entityId",
  u.name as "performedBy",
  al."createdAt",
  al.details
FROM activity_logs al
LEFT JOIN users u ON al."userId" = u.id
ORDER BY al."createdAt" DESC
LIMIT 20;
```

### **Check User Roles**

```sql
SELECT id, email, name, role, "isActive"
FROM users
ORDER BY "createdAt" DESC;
```

---

## 🔐 Security Notes

### **What Phase 0 Protects Against**

✅ **Unauthorized edits** - Users can't edit POs they didn't create
✅ **Silent changes** - All changes are logged
✅ **Accidental modifications** - Warnings for confirmed POs
✅ **Quick edit mistakes** - 30-min window to fix approval errors

### **What Phase 0 Does NOT Protect Against** (Coming in Phase 1)

❌ Scope isolation (Merchandiser A can still see Merchandiser B's POs)
❌ Locking (POs can still be edited despite warnings)
❌ Manager override workflow
❌ Fine-grained permissions (Finance, Factory roles)
❌ Customer assignment

---

## 🐛 Troubleshooting

### **"Unauthorized" error on every request**

**Cause:** JWT token invalid or expired

**Solution:**
```bash
# Logout and login again
# Or clear cookies in browser DevTools
```

### **"PO not found" when trying to edit**

**Cause:** PO doesn't exist or wrong ID

**Solution:**
```sql
SELECT id, "poNo" FROM purchase_orders WHERE "poNo" = 'YOUR_PO_NUMBER';
```

### **Audit log is empty**

**Cause:** Migration didn't run or logging failed

**Solution:**
```bash
# Check if columns exist
npx prisma studio
# Open ActivityLog table, check for beforeData/afterData columns
```

### **Bootstrap admin user doesn't work**

**Cause:** Email already exists or migration failed

**Solution:**
```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'admin@garment-erp.local';

-- If not, create manually:
INSERT INTO users (id, email, "passwordHash", name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@garment-erp.local',
  '$2b$10$rBV2KXx7P6/WO9.HzV8Zj.9nNm8kZJyK5zBr4QZvJzxqT0F1yW0gK',
  'System Admin',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

---

## 📈 What's Next

### **Phase 1 (1-2 months):**
- Manager role with override + reason
- Customer assignment (merchandiser scope)
- Locking policy (prevent edits after confirm)
- Finance + Factory roles

### **Phase 2 (3-4 months):**
- Delegation mechanism
- Time-based access
- Advanced audit viewer
- Row-level security

---

## 💡 Usage Examples

### **In Your API Routes:**

```javascript
import { checkPermission } from '@/lib/authorization';
import { logActivity } from '@/lib/audit';

export async function PUT(request, { params }) {
  const user = await getCurrentUser();

  // 1. Check permission
  const authCheck = await checkPermission(user, 'update', 'PO', existingPO);
  if (!authCheck.allowed) {
    return NextResponse.json({ error: authCheck.reason }, { status: 403 });
  }

  // 2. Perform update
  const updated = await prisma.purchaseOrder.update({ ... });

  // 3. Log activity
  await logActivity({
    userId: user.id,
    action: 'UPDATE',
    entity: 'PO',
    entityId: updated.id,
    beforeData: before,
    afterData: updated,
  });

  return NextResponse.json(updated);
}
```

### **In Your UI:**

```javascript
// Show edit button only if user can edit
if (po.createdByUserId === currentUser.id && po.status === 'DRAFT') {
  return <button onClick={handleEdit}>Edit PO</button>;
} else if (po.status !== 'DRAFT') {
  return <span className="text-gray-400" title="PO is confirmed">🔒 Locked</span>;
}
```

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review audit logs: `SELECT * FROM activity_logs ORDER BY "createdAt" DESC LIMIT 20`
3. Verify user roles: `SELECT * FROM users`
4. Check authorization rules in `src/lib/authorization.js`

---

**Phase 0 is now complete!** You have basic security in place and can launch Production WIP. 🚀

Iterate based on real usage before implementing Phase 1.
