# Garment Trade & Manufacturing ERP

Purpose-built ERP for garment sourcing, development, manufacturing, and trading. Covers the full lifecycle from customer development requests (SRS) through costing, production, shipping, invoicing, and P&L reconciliation.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18.2
- **Database**: PostgreSQL + Prisma 5 (with migrations)
- **Auth**: JWT (HTTP-only cookies, bcrypt)
- **UI**: Tailwind CSS 3

---

## Deploy on Replit

### 1. Import the repo

Create a new Repl → Import from ZIP or GitHub.

### 2. Enable PostgreSQL

In the Replit sidebar, go to **Tools → Database → PostgreSQL**.
Replit will auto-inject `DATABASE_URL` into your environment — **do not set it manually**.

### 3. Set Replit Secrets

Open the **Secrets** panel (lock icon) and add:

| Secret | Required | Notes |
|--------|----------|-------|
| `JWT_SECRET` | **Yes** | Any long random string (min 32 chars). The app will refuse to start without it. |
| `DATABASE_URL` | Auto | Provided automatically by Replit Postgres. Only set manually if using an external DB (Neon, Supabase, Railway). |
| `ALLOW_SEED` | Optional | Set to `true` to run the demo seed script. Remove after seeding. |

### 4. Run setup commands

Open the **Shell** tab and run in order:

```bash
npm install
npx prisma generate
npm run migrate:deploy
```

To load demo data (optional — one-time only):

```bash
ALLOW_SEED=true npm run seed
```

Then start the app:

```bash
npm run build
npm start
```

Or for development mode:

```bash
npm run dev
```

### 5. Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@garment-erp.com | admin123 |
| Merchandiser | merch@garment-erp.com | merch123 |

---

## Verification Checklist

After deployment, confirm these work:

- [ ] **Login works** — admin and merch accounts can sign in
- [ ] **Dashboard loads** — KPI cards show counts
- [ ] **RBAC enforced** — Log in as `merch@garment-erp.com` (MERCHANDISER role), then visit `/api/invoices` directly → should return `403 Forbidden`
- [ ] **Packing list flow** — Create a PO first, then go to Packing Lists → Create → Add cartons with size qty → Totals display correctly
- [ ] **Carton CBM calculates** — Enter L/W/H dimensions on a carton → CBM auto-computes

---

## RBAC Role Matrix

| Role Group | Roles Included | Access |
|-----------|----------------|--------|
| **ADMIN** | ADMIN | Full access, user management |
| **FINANCE** | ADMIN, FINANCE, MANAGEMENT | Invoices, payments, costing, order P&L |
| **OPS** | ADMIN, MERCHANDISER, PRODUCTION_MANAGER, SOURCING_BUYER, QC_MANAGER, WAREHOUSE, SHIPPING, MANAGEMENT | All operational modules |
| **ALL** | All roles | Dashboard, read-only views |

---

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run migrate:dev` | Create new migration (development) |
| `npm run migrate:deploy` | Apply migrations (production/deploy) |
| `npm run seed` | Seed demo data (guarded in production) |
| `npm run db:studio` | Open Prisma Studio |

---

## Modules

| Module | Description |
|--------|-------------|
| **Customers** | Profiles, payment terms, currency settings |
| **SRS** | Development request intake with costing sheets |
| **Styles** | Style master with BOM, tech packs |
| **Samples** | Multi-stage tracking (Proto → Fit → PP → TOP) |
| **Approvals** | Lab dip, fabric, trim, strike-off tracking |
| **Purchase Orders** | Full PO with size-color matrix |
| **Suppliers** | Typed supplier profiles (mill, trim, CMT, etc.) |
| **Materials** | Material master with multi-supplier pricing |
| **Supplier POs** | Procurement linked to customer POs |
| **Factories** | In-house + external, any country |
| **Production** | Stage pipeline (Cut → Sew → Wash → QC → Pack) |
| **QC** | AQL-based inspection with defect tracking |
| **Packing Lists** | Carton-level packing with size breakdown, CBM, weights |
| **Shipments** | Lifecycle tracking, ROG date → payment trigger |
| **Invoices** | Auto-generated from PO, payment recording |
| **Order P&L** | Per-order cost vs revenue analysis |
| **Payments / AR** | Accounts receivable dashboard |

---

## Key Workflow

```
SRS → Costing → Quote → PO →
  ├─ Styles & BOM
  ├─ Samples (Fit → PP → TOP)
  ├─ Approvals (Lab Dip, Fabric, Trim)
  ├─ Supplier POs (Procurement)
  ├─ Production (Factory → Cut → Sew → QC → Pack)
  ├─ Packing List (Cartons → Size Breakdown → CBM)
  ├─ Shipment (ETD → ETA → ROG)
  ├─ Invoice (auto from PO, due = ROG + terms)
  └─ Order P&L (Revenue − Actual Costs)
```
