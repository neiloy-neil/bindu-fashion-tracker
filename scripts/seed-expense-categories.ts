/**
 * Seeds the 30 standardized expense categories from the Bindu Fashion
 * Expense Head Guideline (Expense_Head_Merged_v2.xlsx).
 *
 * Run with:  npx tsx scripts/seed-expense-categories.ts
 *
 * Uses upsert so it's safe to re-run — existing categories are updated
 * with the latest description/guideline text; new ones are created.
 */

import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

const CATEGORIES: Array<{
  name: string
  description: string
  frequency: string
  requiresApproval: boolean
  requiresAttachment: boolean
}> = [
  {
    name: 'Staff Salaries',
    description:
      'Use for regular monthly salaries of full-time and part-time staff. Includes Branch Manager, Security Guard, Cleaner, and support staff salaries.\n\n⚠ DO NOT use for bonuses or advances — those have separate categories.\n\nExamples: Staff Salary, Branch Manager Salary, Security Guard Salary, Night Guard Salary\nApproval: Head Office + BM',
    frequency: 'MONTHLY',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Bonus & Increment',
    description:
      'Use for all one-time or periodic bonuses: Eid bonus, yearly attendance bonus, OT bonus, and salary increments. Requires Boss/Head Office approval before entry.\n\nExamples: Eid Bonus, Ramadan Eid Bonus + Increment, Yearly Attendance Bonus, Eid Duty OT Bonus\nApproval: Boss / Head Office\n\n⚠ Must have written approval before payment.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Salary Advance',
    description:
      'Use only when an employee requests a salary advance before payday. Must have written approval from the Branch Manager or higher authority. Record the employee\'s name in the notes field.\n\nExamples: Advance Salary, Salary Staff Advance\nApproval: BM Written Approval\n\n⚠ Record employee name in notes every time.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: false,
  },
  {
    name: 'Sales Commission',
    description:
      'Use for all sales-based commissions paid to salesmen or given as cashback to customers. Must reference the sales report or invoice number in notes.\n\nExamples: Daily Sales Commission, Instant Sale Commission, Best Salesman Award\nApproval: BM (auto from report)\n\n⚠ DO NOT include bonuses here. Must reference sales report or invoice number.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Target & Performance Bonus',
    description:
      'Use for target-based incentives tied to sales goals. Must have monthly target sheet attached. Requires Head Office approval. Separate from regular commission.\n\nExamples: Target Bonus, Target Achievement Amount, Ramadan Target Bonus\nApproval: Head Office\n\n⚠ Attach monthly target sheet as proof.',
    frequency: 'MONTHLY',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Showroom & Office Rent',
    description:
      'Use for monthly rent paid to property owners for showrooms, outlets, or office spaces. Always record the property owner name and location in the notes. Keep a copy of the rent receipt.\n\nExamples: Showroom Rent, Cox-2 Showroom Rent, Cox-1 & Cox-2 Outlet Rent, Barishal Branch Rent\nApproval: Head Office\n\n⚠ Keep original rent receipt. Note owner name.',
    frequency: 'MONTHLY',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Staff Housing Rent',
    description:
      'Use only for rent paid on behalf of staff members for their residential accommodation. Record the staff member name in notes. Requires Boss permission.\n\nExamples: Staff Home Rent, Mamun (BM) Home Rent, Mahabub Home Rent\nApproval: Boss Permission\n\n⚠ Only for staff accommodation. Note staff name.',
    frequency: 'MONTHLY',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Godown & Store Rent',
    description:
      'Use for rent of warehouse, godown, or storage spaces. Record the property address and owner details in notes. Always obtain a rent receipt.\n\nExamples: Warehouse Rent, Room & Godown Rent, Store Rent\nApproval: Head Office\n\n⚠ Get rent receipt from property owner.',
    frequency: 'MONTHLY',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Advance & Deposit (Property)',
    description:
      'Use when paying a security deposit or advance amount to a property owner. This is a recoverable payment — note it separately in the monthly report. Requires written receipt from owner.\n\nExamples: Basa Advance, Land Owner Showroom Advance, Showroom Advance\nApproval: Boss + Receipt Required\n\n⚠ Recoverable — flag separately in monthly report.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Utilities (Electricity & Water)',
    description:
      'Use for all electricity and water-related bills for showrooms, outlets, godowns, or offices. Record the meter reading period and location (branch name) in notes. Keep the utility bill as proof.\n\nExamples: Electric Bill, Electricity Recharge, Lighting Bill, Water Bill, Water Pump\nApproval: BM\n\n⚠ Note meter reading period and branch location.',
    frequency: 'MONTHLY',
    requiresApproval: false,
    requiresAttachment: true,
  },
  {
    name: 'Utilities (Internet, Phone & WiFi)',
    description:
      'Use for monthly internet, WiFi, and phone bill payments for the branch office. Record the service provider and account number in notes. Personal mobile recharges must have Boss approval.\n\nExamples: WiFi Bill, Monthly Internet Bill, Monthly Phone Bill, Mobile Recharge\nApproval: BM\n\n⚠ Personal mobile recharges need Boss approval.',
    frequency: 'MONTHLY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Generator & Fuel',
    description:
      'Use for all generator-related costs: fuel (petrol/octane), repairs, battery charging, and accessories. Record the quantity and rate in notes where applicable. Must cross-check with generator logbook.\n\nExamples: Generator Petrol & Rent, Generator Repair, Generator Battery Charging, Generator Octane & Rent\nApproval: BM\n\n⚠ Cross-check with generator logbook always.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Transport & Vehicle Rent',
    description:
      'Use for all hired vehicle costs including vans, autos, CNGs, buses, and pickups for branch operations. Record destination, purpose, and driver details in notes.\n\nExamples: Van Rent, Auto Rent, Bus Rent, CNG Rent, Pickup Rent, Rickshaw Cost\nApproval: BM\n\n⚠ Record destination & purpose. Do NOT use for courier delivery — use Courier & Delivery category.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Staff Travel & Tour',
    description:
      'Use for inter-city or inter-branch travel costs for staff on official duty. Must include travel purpose and staff name in notes. Requires Branch Manager or Head Office approval for overnight trips.\n\nExamples: Jashore to Dhaka Tour Rent, Teknaf to Barishal Travel Cost, Cox\'s Bazar to Jashore Tour\nApproval: BM / Head Office\n\n⚠ Head Office approval required for overnight trips.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: false,
  },
  {
    name: 'Courier & Delivery',
    description:
      'Use for all parcel/product courier charges and delivery costs between branches or to customers. Record the courier company, tracking number, and destination in notes.\n\nExamples: Courier Bill, AJR Courier, Steadfast, Rupali Courier, Courier Charge\nApproval: BM\n\n⚠ Note courier company and tracking number. DO NOT include vehicle rent here.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Staff Conveyance',
    description:
      'Use for daily local travel reimbursements to staff. Includes late-night conveyance and new SA/BM joining travel. Record staff name and travel date. Must have attendance/duty record to support the claim.\n\nExamples: Conveyance, Conveyance New SA, Late Night Conveyance, Casual Daily Conveyance\nApproval: BM\n\n⚠ Must match attendance/duty record.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Marketing & Advertising',
    description:
      'Use for all paid marketing activities: banner printing, miking, SMS campaigns, signboards, and digital content. Boss approval required. Record the vendor name and purpose.\n\nExamples: Banner Print, Miking, SMS Campaign, Signboard, Neon Sign, PVC Print, News Telecast\nApproval: Boss Required\n\n⚠ Record vendor name and purpose of campaign. DO NOT include in-store decoration here.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Events & Decoration',
    description:
      'Use for in-store events, seasonal decoration, and celebration costs (New Year, Eid, etc.). Requires Boss approval in advance. Record the event name and date. Balloon, flower, and decoration items go here.\n\nExamples: New Year Decoration, Outlet Decoration Cost, Light Music Party, Balloon, Party Spray\nApproval: Boss Pre-Approval\n\n⚠ Note event name and date in the record.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: false,
  },
  {
    name: 'Food & Refreshments (Staff)',
    description:
      'Use for food and drink expenses for staff: daily tea, lunch, snacks, and Iftar during Ramadan. Record the number of people and occasion. Daily tea and snacks do not need special approval.\n\nExamples: Lunch Bill, Tea Bill, Snacks, Nasta, Iftar, Coffee Bill, Mineral Water\nApproval: BM (routine)\n\n⚠ Guest meals go in Customer Entertainment & Gifts category, not here.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Customer Entertainment & Gifts',
    description:
      'Use for expenses related to hosting or entertaining customers, guests, or VIP visitors. Includes refreshments, meals, and gift items given to customers. Record the guest name and purpose.\n\nExamples: Customer Appayan, Customer Refreshments, Guest Bill, Entertainment, Dinner Bill\nApproval: Boss (above 500 BDT)\n\n⚠ Note guest name and visit purpose. Boss approval needed above 500 BDT.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: false,
  },
  {
    name: 'Donations & Charity',
    description:
      'Use only for approved community donations and charity contributions. All donations must have written Boss approval before payment. Record the recipient\'s name and purpose.\n\nExamples: Mosque Donation, Market Donation, Puja Donation, Mahfil Donation, Hijra Donation\nApproval: Boss Written Approval\n\n⚠ Personal donations are NOT a branch expense.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: false,
  },
  {
    name: 'Cleaning & Hygiene',
    description:
      'Use for all cleaning and hygiene products: tissue paper, detergents, mops, air fresheners, and cleaning services. Record quantities purchased. Routine purchases can be done without special approval.\n\nExamples: Tissue, Air Freshener, Glass Cleaner, Surf XL, Hand Wash, Dustbin, Floor Mop\nApproval: BM (routine)\n\n⚠ Record quantities purchased.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Security',
    description:
      'Use for security-related costs: CCTV equipment and servicing, fire extinguishers, and security guard payments. Record equipment serial numbers where applicable.\n\nExamples: CCTV Instrument, CC Camera Servicing, Fire Extinguisher, Torch Light\nApproval: BM / Head Office\n\n⚠ Fire safety equipment purchases require Head Office awareness.',
    frequency: 'AS_NEEDED',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Office Stationery & Printing',
    description:
      'Use for stationery items (pens, registers, paper) and printing costs (ID cards, documents, notices). Record items and quantity in notes. Routine stationery needs no special approval.\n\nExamples: Stationery, Stamp, Print & Photocopy, White Paper, ID Card, Printer Cartridge\nApproval: BM (routine)\n\n⚠ Note printer model for cartridge purchases.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Repairs & Maintenance',
    description:
      'Use for repair and maintenance of showroom equipment, furniture, fixtures, or garments. Record the item repaired, technician name, and nature of repair. For AC or electrical repairs, note the unit location.\n\nExamples: Speaker Repair, Glass Door Repair, AC Servicing, Shutter Repairing, Fan Repair, Zipper Change\nApproval: BM / Boss (major repairs)\n\n⚠ Major repairs need Boss sign-off. Note technician name.',
    frequency: 'AS_NEEDED',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Electrical Equipment & Accessories',
    description:
      'Use for purchase of electrical items and accessories: bulbs, fans, batteries, UPS, cables, and sound equipment. Record item name, quantity, and unit price.\n\nExamples: LED Light Bulbs, UPS Battery, IPS Battery, Multi Plug, Cable, Sound System, Ceiling Fan\nApproval: Boss (above 2000 BDT)\n\n⚠ Any purchase above 2,000 BDT needs Boss approval. Record quantity and unit price.',
    frequency: 'AS_NEEDED',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'Banking & Digital Payment',
    description:
      'Use for all banking transactions and digital payment fees: bKash, Nagad, POS charges, and bank service fees. Record the transaction reference number in notes.\n\nExamples: bKash, Nagad, DBBL POS Machine, Banking Fee, DBBL Agent Banking Deposit\nApproval: BM\n\n⚠ Always record transaction reference number.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
  {
    name: 'VAT, Tax & Compliance',
    description:
      'Use for all government-related payments: VAT, trade license renewal, labour license, and compliance fees. Always keep the original government receipt.\n\nExamples: VAT Purpose, Trade License, Labour License, VAT Officer Tips, Labour Federation\nApproval: Boss Written Permission\n\n⚠ Keep original government receipt always. VAT officer gifts/tips must have Boss\'s written permission.',
    frequency: 'AS_NEEDED',
    requiresApproval: true,
    requiresAttachment: true,
  },
  {
    name: 'Software & Technology',
    description:
      'Use for software subscription fees, CRM costs, and tech-related purchases. All software payments must be pre-approved by Head Office. Record the software name, vendor, and subscription period.\n\nExamples: Software Payment, CRM Cost, Online Charge, Software Advance\nApproval: Head Office Pre-Approval\n\n⚠ Record software name, vendor, and subscription period.',
    frequency: 'MONTHLY',
    requiresApproval: true,
    requiresAttachment: false,
  },
  {
    name: 'Petty Cash & Miscellaneous',
    description:
      'Use ONLY when no other category applies. This should be a LAST RESORT. Before selecting Miscellaneous, review all other categories carefully. Always include a detailed description in the notes field.\n\nExamples: Petty Cash, Others Expense, Cash Adjustment, Wrong Entry, Refund Money, Miscellaneous items\nApproval: BM + Monthly HO Review\n\n⚠ LAST RESORT ONLY. Add full description in notes. Head Office review required monthly for all entries in this category.',
    frequency: 'DAILY',
    requiresApproval: false,
    requiresAttachment: false,
  },
]

async function main() {
  console.log(`Seeding ${CATEGORIES.length} expense categories...`)

  for (const cat of CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        description: cat.description,
        frequency: cat.frequency,
        requiresApproval: cat.requiresApproval,
        requiresAttachment: cat.requiresAttachment,
        isActive: true,
        type: 'EXPENSE',
      },
      create: {
        name: cat.name,
        type: 'EXPENSE',
        isActive: true,
        isDefault: false,
        frequency: cat.frequency,
        requiresApproval: cat.requiresApproval,
        requiresAttachment: cat.requiresAttachment,
        description: cat.description,
      },
    })
    console.log(`  ✓ ${result.name} (id=${result.id})`)
  }

  console.log('Done.')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
