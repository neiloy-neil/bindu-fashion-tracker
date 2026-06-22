"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var prisma_1 = require("./lib/prisma");
var bcrypt = __importStar(require("bcryptjs"));
var crypto_1 = __importDefault(require("crypto"));
var BRANCHES = [
    { name: 'Aziz 1', code: 'AZIZ1' },
    { name: 'Aziz-2', code: 'AZIZ2' },
    { name: "Cox's Bazar-1", code: 'COX1' },
    { name: "Cox's Bazar-2", code: 'COX2' },
    { name: "Cox's Bazar-3", code: 'COX3' },
    { name: 'Basurhat', code: 'BASURHAT' },
    { name: 'Dorgahgate', code: 'DORGAHGATE' },
    { name: 'Lamabazar', code: 'LAMABAZAR' },
    { name: 'Barishal', code: 'BARISHAL' },
    { name: 'Teknaf', code: 'TEKNAF' },
    { name: 'Jashore', code: 'JASHORE' },
];
var DEFAULT_INCOME_CATEGORIES = [
    'Opening Balance', 'Cash Sale', 'Due Received', 'Condition Rec.',
    'bKash Income', 'Nagad Income', 'Rocket Income', 'POS Pubali',
    'POS City', 'POS BRAC', 'POS DBBL', 'A/C Bindu', 'Bindu-2 Transfer', 'Received Aziz-1'
];
var DEFAULT_EXPENSE_CATEGORIES = [
    'Advance TK', 'Condition Change', 'Party Payment', 'Aziz-2 Transfer',
    'Bank Deposit', 'DMCB', 'Sale Bonus', 'Courier/Labor Bill', 'Snacks/Tea',
    'Lunch', 'Conveyance', 'Other Expense', 'Donation', 'Stationary',
    'Net/WIFI', 'Utilities', 'Water Bill', 'Daily Somity', 'Electric Recharge',
    'Petrol/Mobil', 'Phone Bill', 'Shop Rent', 'Salary', 'Return Exp.',
    'bKash Expense', 'Nagad Expense', 'POS Expense', 'Rocket DBBL',
    'Boss Personal/All', 'A/C Bindu Expense', 'VAT', 'VAT Exp', 'Emg Fund', 'Boss Gift'
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var categoryMap, _i, DEFAULT_INCOME_CATEGORIES_1, name_1, cat, _a, DEFAULT_EXPENSE_CATEGORIES_1, name_2, cat, branchRecords, _b, BRANCHES_1, b, branch, adminPasswordPlain, branchPasswordPlain, adminPasswordHash, branchPasswordHash, existingAdmin, _c, branchRecords_1, branch, username, existingBranchUser, now, year, month, i, date, _d, _e, branch, entry, itemsData, _f, itemsData_1, item, existingSettings;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log('Seeding data...');
                    categoryMap = new Map();
                    _i = 0, DEFAULT_INCOME_CATEGORIES_1 = DEFAULT_INCOME_CATEGORIES;
                    _g.label = 1;
                case 1:
                    if (!(_i < DEFAULT_INCOME_CATEGORIES_1.length)) return [3 /*break*/, 4];
                    name_1 = DEFAULT_INCOME_CATEGORIES_1[_i];
                    return [4 /*yield*/, prisma_1.prisma.category.upsert({
                            where: { name: name_1 },
                            update: {},
                            create: { name: name_1, type: 'INCOME', isDefault: true, isActive: true }
                        })];
                case 2:
                    cat = _g.sent();
                    categoryMap.set(name_1, cat.id);
                    _g.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    _a = 0, DEFAULT_EXPENSE_CATEGORIES_1 = DEFAULT_EXPENSE_CATEGORIES;
                    _g.label = 5;
                case 5:
                    if (!(_a < DEFAULT_EXPENSE_CATEGORIES_1.length)) return [3 /*break*/, 8];
                    name_2 = DEFAULT_EXPENSE_CATEGORIES_1[_a];
                    return [4 /*yield*/, prisma_1.prisma.category.upsert({
                            where: { name: name_2 },
                            update: {},
                            create: { name: name_2, type: 'EXPENSE', isDefault: true, isActive: true }
                        })];
                case 6:
                    cat = _g.sent();
                    categoryMap.set(name_2, cat.id);
                    _g.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log('✅ Categories seeded.');
                    branchRecords = [];
                    _b = 0, BRANCHES_1 = BRANCHES;
                    _g.label = 9;
                case 9:
                    if (!(_b < BRANCHES_1.length)) return [3 /*break*/, 12];
                    b = BRANCHES_1[_b];
                    return [4 /*yield*/, prisma_1.prisma.branch.upsert({
                            where: { code: b.code },
                            update: {},
                            create: { name: b.name, code: b.code, isActive: true }
                        })];
                case 10:
                    branch = _g.sent();
                    branchRecords.push(branch);
                    _g.label = 11;
                case 11:
                    _b++;
                    return [3 /*break*/, 9];
                case 12:
                    adminPasswordPlain = crypto_1.default.randomBytes(6).toString('hex');
                    branchPasswordPlain = crypto_1.default.randomBytes(6).toString('hex');
                    return [4 /*yield*/, bcrypt.hash(adminPasswordPlain, 10)];
                case 13:
                    adminPasswordHash = _g.sent();
                    return [4 /*yield*/, bcrypt.hash(branchPasswordPlain, 10)
                        // Admin User
                    ];
                case 14:
                    branchPasswordHash = _g.sent();
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({ where: { username: 'admin' } })];
                case 15:
                    existingAdmin = _g.sent();
                    if (!!existingAdmin) return [3 /*break*/, 17];
                    return [4 /*yield*/, prisma_1.prisma.user.create({
                            data: {
                                username: 'admin',
                                passwordHash: adminPasswordHash,
                                role: 'ADMIN'
                            }
                        })];
                case 16:
                    _g.sent();
                    console.log("\u2705 Admin user seeded! Username: admin | Password: ".concat(adminPasswordPlain, " (Change this immediately!)"));
                    return [3 /*break*/, 18];
                case 17:
                    console.log("\u2705 Admin user already exists.");
                    _g.label = 18;
                case 18:
                    _c = 0, branchRecords_1 = branchRecords;
                    _g.label = 19;
                case 19:
                    if (!(_c < branchRecords_1.length)) return [3 /*break*/, 23];
                    branch = branchRecords_1[_c];
                    username = "".concat(branch.code.toLowerCase(), "_branch");
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({ where: { username: username } })];
                case 20:
                    existingBranchUser = _g.sent();
                    if (!!existingBranchUser) return [3 /*break*/, 22];
                    return [4 /*yield*/, prisma_1.prisma.user.create({
                            data: {
                                username: username,
                                passwordHash: branchPasswordHash,
                                role: 'BRANCH',
                                branchId: branch.id
                            }
                        })];
                case 21:
                    _g.sent();
                    _g.label = 22;
                case 22:
                    _c++;
                    return [3 /*break*/, 19];
                case 23:
                    console.log("\u2705 Branch users seeded. Default new user password: ".concat(branchPasswordPlain, " (Change this immediately!)"));
                    now = new Date();
                    year = now.getFullYear();
                    month = now.getMonth();
                    i = 1;
                    _g.label = 24;
                case 24:
                    if (!(i <= 5)) return [3 /*break*/, 32];
                    date = new Date(year, month, i);
                    _d = 0, _e = branchRecords.slice(0, 2);
                    _g.label = 25;
                case 25:
                    if (!(_d < _e.length)) return [3 /*break*/, 31];
                    branch = _e[_d];
                    return [4 /*yield*/, prisma_1.prisma.dailyEntry.upsert({
                            where: {
                                date_branchId: {
                                    date: date,
                                    branchId: branch.id
                                }
                            },
                            update: {},
                            create: {
                                date: date,
                                branchId: branch.id,
                            }
                        })
                        // Random sales data
                    ];
                case 26:
                    entry = _g.sent();
                    itemsData = [
                        { categoryId: categoryMap.get('Opening Balance'), amount: 5000 },
                        { categoryId: categoryMap.get('Cash Sale'), amount: Math.floor(Math.random() * 50000) + 10000 },
                        { categoryId: categoryMap.get('bKash Income'), amount: Math.floor(Math.random() * 20000) },
                        { categoryId: categoryMap.get('Due Received'), amount: Math.floor(Math.random() * 5000) },
                        { categoryId: categoryMap.get('Lunch'), amount: Math.floor(Math.random() * 500) + 200 },
                        { categoryId: categoryMap.get('Conveyance'), amount: Math.floor(Math.random() * 300) + 100 },
                        { categoryId: categoryMap.get('Bank Deposit'), amount: Math.floor(Math.random() * 30000) },
                    ];
                    _f = 0, itemsData_1 = itemsData;
                    _g.label = 27;
                case 27:
                    if (!(_f < itemsData_1.length)) return [3 /*break*/, 30];
                    item = itemsData_1[_f];
                    return [4 /*yield*/, prisma_1.prisma.entryItem.upsert({
                            where: {
                                entryId_categoryId: {
                                    entryId: entry.id,
                                    categoryId: item.categoryId
                                }
                            },
                            update: { amount: item.amount },
                            create: {
                                entryId: entry.id,
                                categoryId: item.categoryId,
                                amount: item.amount
                            }
                        })];
                case 28:
                    _g.sent();
                    _g.label = 29;
                case 29:
                    _f++;
                    return [3 /*break*/, 27];
                case 30:
                    _d++;
                    return [3 /*break*/, 25];
                case 31:
                    i++;
                    return [3 /*break*/, 24];
                case 32: return [4 /*yield*/, prisma_1.prisma.systemSettings.findFirst()];
                case 33:
                    existingSettings = _g.sent();
                    if (!!existingSettings) return [3 /*break*/, 35];
                    return [4 /*yield*/, prisma_1.prisma.systemSettings.create({
                            data: {
                                companyName: 'Bindu Premium',
                                generatedBy: ''
                            }
                        })];
                case 34:
                    _g.sent();
                    console.log('✅ SystemSettings seeded.');
                    return [3 /*break*/, 36];
                case 35:
                    console.log('✅ SystemSettings already exists.');
                    _g.label = 36;
                case 36:
                    console.log('✅ Seeding completed!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
