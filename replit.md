# Garment ERP

## Overview
A garment trading & manufacturing ERP system built with Next.js 14, Prisma ORM, and PostgreSQL. Manages the full lifecycle: customer SRS/development requests, styles, costing, purchase orders, supplier management, production, QC, packing, shipping, invoicing, and P&L tracking.

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
      api/           - API routes (auth, customers, styles, POs, etc.)
      (dashboard)/   - Dashboard pages (authenticated)
      login/         - Login page
    components/      - Shared UI (Sidebar, DataTable, StatCard, etc.)
    lib/             - Auth, Prisma client, helpers
```

## Running
- Workflow: `cd garment-erp && PORT=5000 npx next dev -p 5000`
- Demo login: admin@garment-erp.com / admin123

## Key Decisions
- RBAC with role groups (ADMIN, FINANCE, OPS, ALL)
- Sequential number generation for SRS, PO, invoices, etc.
- Decimal precision standardized to db.Decimal(12,2) for currency, (12,4) for quantities

## Recent Changes
- Fixed Decimal precision on totalCBM, adjustments, amountInBase fields
- Fixed customer DELETE auth check (was bypassing requireAuth error)
- Fixed mass assignment vulnerability in style/production/SRS PUT routes
- Added try/catch error handling in styles GET route
- Added Cache-Control headers to prevent stale cache in Replit preview
