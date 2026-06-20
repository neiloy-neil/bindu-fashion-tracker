# Bindu Fashion Tracker

Daily cash-flow entry & reconciliation tracker for Bindu's branches. Includes income/expense ledger, edit-request workflows, admin dashboards, and Excel/PDF exports.

## Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase Storage bucket (for receipt images)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```
   - Set `DATABASE_URL` to your PostgreSQL database.
   - Set `NEXTAUTH_SECRET`.
   - Set `CRON_SECRET` for cron jobs.
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

3. **Database Migration**
   Initialize your local database schema:
   ```bash
   npm run db:migrate
   ```

4. **Database Seeding**
   Seed the database with initial users and dummy entries:
   ```bash
   npm run db:seed
   ```
   *Note: This creates real branches and users for testing. The default admin user is `admin`/`admin123`.*

5. **Run the Application**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Testing
Run the test suite using vitest:
```bash
npm run test
```
