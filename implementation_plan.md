# Advanced Features & UX Overhaul Plan

This document outlines the architecture and steps required to implement the advanced features discussed during our planning phase.

## User Review Required

> [!WARNING]
> **Supabase Integration:** The receipt upload feature will require you to create a free [Supabase](https://supabase.com/) project to use their Storage buckets. I will need you to provide the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` once we start implementation. Are you comfortable creating a Supabase account for this?

> [!IMPORTANT]
> **Database Schema Changes:** We will need to update the Prisma schema to add the `EditRequest` model and add a `receiptUrl` to the `DailyEntry` model. This requires running `npx prisma db push`, which alters your database.

## Proposed Changes

---

### 1. Database Schema & API Layer

#### [MODIFY] `prisma/schema.prisma`
- Add `receiptUrl` (String?) to `DailyEntry` model.
- Add `EditRequest` model with fields:
  - `id` (Int, @id)
  - `entryId` (Int, references DailyEntry)
  - `requestedBy` (Int, references User)
  - `changes` (Json - stores the diff or new values)
  - `reason` (String)
  - `status` (Enum: PENDING, APPROVED, REJECTED)
  - `createdAt`, `updatedAt`

#### [NEW] `app/api/edit-requests/route.ts`
- **POST**: Branch users submit an edit request for a locked past entry.
- **GET**: Admin fetches pending edit requests for the dashboard.
- **PATCH**: Admin approves (applies changes to `DailyEntry`) or rejects the request.

#### [NEW] `app/api/entries/last-balance/route.ts`
- **GET**: Fetches the most recent entry for a specific branch to extract the previous day's `netBalance`.

---

### 2. Receipt Uploads & Supabase

#### [NEW] `lib/supabase.ts`
- Initialize the Supabase client for uploading receipt images.

#### [MODIFY] `app/entries/new/page.tsx`
- Add an Image Upload UI component that uploads the file to Supabase Storage and returns the public URL.
- Attach the URL to the form payload before saving.

---

### 3. Ultimate User Experience (UX)

#### [MODIFY] `app/entries/new/page.tsx` (Autosave & Carryover)
- **Smart Balance Carryover**: On load, `fetch('/api/entries/last-balance')` and auto-populate `Opening Balance`.
- **Autosave**: Use `localStorage` to save form values `onChange`. Clear `localStorage` on successful submission.
- **Keyboard Navigation**: Ensure all `CurrencyInput` fields support `Tab` navigation. Add an `onKeyDown` listener so pressing `Enter` moves to the next input instead of submitting the form prematurely.

#### [NEW] `components/layout/ThemeToggle.tsx`
- Add a ☀️/🌙 toggle in the `Sidebar.tsx`.
- Update `globals.css` to define light mode variables (currently it is hardcoded to dark mode).

---

### 4. Dashboard & Insights (Admin)

#### [MODIFY] `app/page.tsx` (Dashboard)
- **Date Ranges**: Replace the Month/Year picker with a flexible Date Range Picker component (e.g., "Last 7 Days", "Custom Range").
- **Recent Activity Feed**: Create a new widget showing a feed of recent actions (e.g., "Mirpur submitted entry", "Dhanmondi requested edit").
- **Edit Requests Widget**: Show pending edit requests so the Admin can quickly approve/reject them.
- **Anomaly Detection**: Add logic in the frontend to highlight if any single expense category exceeds 30% of the total expenses for the period.

#### [NEW] `components/dashboard/PdfGenerator.tsx`
- Integrate `jspdf` and `jspdf-autotable`.
- Add buttons to "Download Daily Report" and "Download Monthly Summary".
- These reports will render the current dashboard state into a clean A4 PDF layout.

---

## Verification Plan

### Automated Tests
- Run `npx tsc` and `npm run build` to ensure no type errors.
- Validate Prisma schema with `npx prisma format` and `npx prisma validate`.

### Manual Verification
- **Admin**: Verify the dashboard loads the custom date ranges, activity feed, and edit requests. Test the PDF download button.
- **Branch**: Test filling out a form, uploading an image, verifying the autosave feature, and ensuring the "Opening Balance" carries over correctly. Ensure they cannot edit a past entry directly, but instead must use the "Request Edit" workflow.
