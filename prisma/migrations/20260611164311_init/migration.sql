-- CreateTable
CREATE TABLE "Branch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "branchId" INTEGER NOT NULL,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "cashSale" REAL NOT NULL DEFAULT 0,
    "dueReceived" REAL NOT NULL DEFAULT 0,
    "conditionRec" REAL NOT NULL DEFAULT 0,
    "bkashIncome" REAL NOT NULL DEFAULT 0,
    "nagadIncome" REAL NOT NULL DEFAULT 0,
    "rocketIncome" REAL NOT NULL DEFAULT 0,
    "posPubali" REAL NOT NULL DEFAULT 0,
    "posCity" REAL NOT NULL DEFAULT 0,
    "posBrac" REAL NOT NULL DEFAULT 0,
    "posDbbl" REAL NOT NULL DEFAULT 0,
    "acBindu" REAL NOT NULL DEFAULT 0,
    "bindu2Transfer" REAL NOT NULL DEFAULT 0,
    "receivedAziz1" REAL NOT NULL DEFAULT 0,
    "advanceTk" REAL NOT NULL DEFAULT 0,
    "conditionChange" REAL NOT NULL DEFAULT 0,
    "partyPayment" REAL NOT NULL DEFAULT 0,
    "aziz2Transfer" REAL NOT NULL DEFAULT 0,
    "bankDeposit" REAL NOT NULL DEFAULT 0,
    "dmcb" REAL NOT NULL DEFAULT 0,
    "saleBonus" REAL NOT NULL DEFAULT 0,
    "courierLbrBill" REAL NOT NULL DEFAULT 0,
    "snacksTea" REAL NOT NULL DEFAULT 0,
    "lunch" REAL NOT NULL DEFAULT 0,
    "conveyance" REAL NOT NULL DEFAULT 0,
    "otherExpense" REAL NOT NULL DEFAULT 0,
    "donation" REAL NOT NULL DEFAULT 0,
    "stationary" REAL NOT NULL DEFAULT 0,
    "netWife" REAL NOT NULL DEFAULT 0,
    "utilities" REAL NOT NULL DEFAULT 0,
    "waterBill" REAL NOT NULL DEFAULT 0,
    "dailySomity" REAL NOT NULL DEFAULT 0,
    "electricRecharge" REAL NOT NULL DEFAULT 0,
    "petrolMobil" REAL NOT NULL DEFAULT 0,
    "phoneBill" REAL NOT NULL DEFAULT 0,
    "shopRent" REAL NOT NULL DEFAULT 0,
    "salary" REAL NOT NULL DEFAULT 0,
    "returnExp" REAL NOT NULL DEFAULT 0,
    "bkashExpense" REAL NOT NULL DEFAULT 0,
    "nagadExpense" REAL NOT NULL DEFAULT 0,
    "posExpense" REAL NOT NULL DEFAULT 0,
    "rocketDbbl" REAL NOT NULL DEFAULT 0,
    "bossPersonalAll" REAL NOT NULL DEFAULT 0,
    "acBinduExpense" REAL NOT NULL DEFAULT 0,
    "vat" REAL NOT NULL DEFAULT 0,
    "vatExp" REAL NOT NULL DEFAULT 0,
    "emgFund" REAL NOT NULL DEFAULT 0,
    "bossGift" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_date_branchId_key" ON "DailyEntry"("date", "branchId");
