"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("@prisma/client");
var pg_1 = require("pg");
var adapter_pg_1 = require("@prisma/adapter-pg");
var globalForPrisma = globalThis;
function createPrismaClient() {
    var pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    var adapter = new adapter_pg_1.PrismaPg(pool);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new client_1.PrismaClient({ adapter: adapter });
}
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
