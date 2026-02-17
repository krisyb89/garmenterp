# Garment ERP

## Overview
A garment trading & manufacturing ERP system built with Next.js 14, Prisma ORM, and PostgreSQL. Manages the full lifecycle: customer SRS/development requests, styles, costing sheets, purchase orders, supplier management, production, QC, packing, shipping, invoicing, WIP tracking, and P&L analysis.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Replit-managed) via Prisma ORM
- **Auth**: JWT (httpOnly cookies) + bcrypt password hashing

## Project Structure
```
garment-erp/
  prisma/           - Schema, migrations, seed
  src/
    app/
      api/           - API routes (auth, customers, styles, POs, wip, costing-sheets, etc.)
      (dashboard)/   - Dashboard pages (authenticated)
      login/         - Login page
    components/      - Shared UI (Sidebar, DataTable, StatCard, EditableWIPTable, etc.)
    lib/             - Auth, Prisma client, helpers, costing utils
```

## Running
- Workflow: `cd garment-erp && PORT=5000 npx next dev -p 5000`
- Demo login: admin@garment-erp.com / admin123

## Key Decisions
- RBAC with role groups (ADMIN, FINANCE, OPS, ALL)
- Sequential number generation for SRS, PO, invoices, etc.
- WIP boards use customizable columns (WIPColumn model) with scope-based separation (SRS vs PO)
- Costing sheets restructured with segmented JSON line items (fabric, trim, labor, packing, misc, freight, duty)
- SRS supports brand, colorPrint, deadline, and wipData JSON for custom WIP columns
- PO supports store, brand, ihDate, and wipData JSON for production WIP columns
- Material categories via MaterialCategory model (replaces old `type` enum)
- Fixed `use(params)` -> `useParams()` across all detail pages for Next.js 14 compatibility

## Recent Changes
- Migrated to updated codebase with WIP tracking and costing restructure
- Added SRS WIP board with customizable columns at /dashboard/wip/srs
- Added Production WIP board with customizable columns at /dashboard/wip/pos
- Added WIPColumn model for customizable column definitions per scope
- Costing sheets restructured: segmented line items (fabricDetails, trimDetails, laborDetails, packingDetails, misDetails, freightDetails, dutyDetails)
- Added MaterialCategory model and API (/api/material-categories)
- SRS schema: added styleNo, brand, colorPrint, deadline, wipData fields
- PO schema: added store, brand, ihDate, wipData fields
- PO detail page: fully editable header fields and line items with inline editing
- Editable line items with add/remove rows, size management, auto-recalculating totals
- Line item CRUD wrapped in Prisma transaction for data integrity
- Fixed use(params) -> useParams() in all 10 detail pages
- Database reset and reseeded with updated schema
