# WorkTrack Pro

Enterprise employee time, attendance, reporting, and admin operations platform built with Next.js 14, React, TypeScript, Prisma, Neon PostgreSQL, NextAuth, Tailwind CSS, ShadCN-style UI, and PWA support.

## Stack

- Next.js 14 App Router
- React 18 + TypeScript
- Prisma ORM
- PostgreSQL / Neon
- NextAuth credentials auth with JWT sessions
- Tailwind CSS + Radix/ShadCN-style components
- Recharts dashboards
- PWA install + offline clock queue

## Included product areas

- Employee dashboard
- Mobile-friendly clock in / clock out workflow
- Weekly and monthly attendance summaries
- Manager live dashboard
- Employee directory with search and pagination
- Monthly reports with CSV / Excel / PDF export
- Admin settings, departments, shifts, and audit activity
- RBAC across employee, manager, admin, and super admin roles

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and update the Neon connection strings:

   ```bash
   copy .env.example .env
   ```

3. Push the Prisma schema to your database:

   ```bash
   npm run db:push
   ```

4. Seed demo data:

   ```bash
   npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

## Quick clock

Employees can now use a public quick clock page instead of a full login when the company enables it in Settings.

- URL: `/quick-clock?company=your-company-slug`
- Supports employee ID lookup
- Supports optional 4-8 digit quick clock PINs
- Respects GPS/geofence policies
- Respects admin-defined clock-in and clock-out windows

## Logo uploads

Company logos are uploaded through Vercel Blob instead of pasting a raw URL.

- Configure `BLOB_READ_WRITE_TOKEN`
- Upload from Settings or Super Admin company management
- The uploaded logo is reused in the workspace shell

## Vercel deployment

This repository is ready to deploy on Vercel as a standard Next.js app.

1. Create a Vercel project from this repository.
2. Add these environment variables in Vercel for Production, Preview, and Development:

   ```text
   DATABASE_URL
   DIRECT_URL
   NEXTAUTH_URL
   NEXTAUTH_SECRET
   BLOB_READ_WRITE_TOKEN
   ```

3. Set `NEXTAUTH_URL` to your deployed domain, for example:

   ```text
   https://your-domain.vercel.app
   ```

4. Run the Prisma schema against Neon before first production use:

   ```bash
   npm run db:push
   ```

5. If you want demo data in preview or first-time production testing:

   ```bash
   npm run db:seed
   ```

6. Public login, reception QR, and door clock links will automatically use the deployed Vercel origin at runtime.

## Demo accounts

All seeded accounts use:

```text
Password123!
```

- `superadmin@smtechie.com`
- `manager.it@smtechie.com`
- `admin@smtechie.com`
- `sipho@smtechie.com`

## Verification

The project has been verified with:

```bash
npm run lint
npm run typecheck
npm run build
```

## Key paths

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/app/(workspace)`
- `src/app/api`
- `src/services`
- `src/components`
