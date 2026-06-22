# Data Migration Guide

This guide details how to export real human resources data (Employees and Salary Records) from the legacy Supabase system and import it into the new Unified Tracker. 

> [!WARNING]
> Do **not** manually recreate employees through the UI if you plan to import historical salary records. You must use the Excel importer so that the `Employee ID` links up correctly.

## Phase 1: Employee Migration

### Step 1.1: Export from Supabase
1. Log into your legacy Supabase project.
2. Navigate to the **Table Editor** > `Employee` table.
3. Click **Export** in the top right and select **CSV**.
4. Save the file (e.g. `supabase_employees.csv`).

### Step 1.2: Prepare for Import
1. Open the CSV in Excel.
2. The importer requires specific columns. Ensure the following column headers exist and map your data accordingly:
   - `Employee ID`: (e.g., "EMP-001") - **CRITICAL: Must match exactly**
   - `Name`: Full name of the employee
   - `Branch`: The exact branch name (e.g., "Office" or "Sylhet")
   - `Designation`: Job title
   - `Basic Salary`: Number only
   - `Conveyance`: Number only
   - `Yearly Leave`: Number of annual leave days

### Step 1.3: Import into the New System
1. Log into the new Unified System as an `ADMIN` or `HR_ADMIN`.
2. Navigate to **HR & Payroll** > **Employees**.
3. Click the **Import** button in the top right.
4. Upload your prepared Excel/CSV file.
5. The system will create all employees. **Note:** The old Supabase UUIDs are discarded; the new system assigns an internal ID but guarantees matching using your `Employee ID` (e.g., "EMP-001").

---

## Phase 2: Salary Record Migration

### Step 2.1: Export from Supabase
1. In Supabase, navigate to the **Table Editor** > `SalaryRecord` table.
2. Click **Export** to CSV.

### Step 2.2: Prepare for Import
1. Open the CSV in Excel.
2. The importer maps salary records using the `Employee ID` string. Ensure your file matches the system's template exactly:
   - `Employee ID` (e.g., "EMP-001")
   - `Name` (Optional but helpful for verification)
   - `Branch` (Optional)
   - `Basic Salary`
   - `Advance (৳)`
   - `Leave (days)`
   - `Leave Adjustment (±days)`
   - `Late (days)`
   - `OT (days)`
   - `Conveyance (৳)`
   - `Attendance Bonus (৳)`
   - `Notes`

> [!IMPORTANT]
> The `Employee ID` column must exactly match the `Employee ID` you imported in Phase 1. The system matches rows entirely based on this string identifier, not the old Supabase `id`.

### Step 2.3: Import into the New System
1. Go to **HR & Payroll** > **Salary Processing**.
2. Select the **Month** and **Year** that corresponds to your data.
3. Click the **Import Excel** button.
4. Upload the prepared file. The system will match each row to the corresponding active Employee using their `Employee ID` and pre-fill the processing table.
5. Review the imported data, then click **Save All Changes** to commit the records to the database.
6. Once validated, click **Lock Month** to finalize the payroll period.

## Troubleshooting
- **Missing Employees**: If the salary importer skips rows, verify that the `Employee ID` in the salary file is an exact case-sensitive match to the one in the Employees table.
- **Branch Names**: If a branch is not recognized, it will default to empty or the first branch. Ensure the names in your sheet exactly match the names defined in the `Admin > Branches` panel.
