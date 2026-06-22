"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcSalary = calcSalary;
exports.calcEid = calcEid;
exports.formatTaka = formatTaka;
var WORKING_DAYS = 26;
function calcSalary(employee, record, yearlyUsedLeave) {
    var _a, _b;
    if (yearlyUsedLeave === void 0) { yearlyUsedLeave = 0; }
    var dailyRate = employee.basicSalary / WORKING_DAYS;
    // Leave deduction: deduct days taken minus any leave adjustment
    var deductableLeave = Math.max(0, record.leaveDaysTaken - ((_a = record.leaveAdjustment) !== null && _a !== void 0 ? _a : 0));
    var leaveDeduction = deductableLeave * dailyRate;
    // Late deduction: every 3 late days = 1 day salary
    var lateDeduction = Math.floor(record.lateDays / 3) * dailyRate;
    // OT: 1 day = 1 day salary
    var otAddition = record.otDays * dailyRate;
    // Use monthly conveyance override if set, else employee default
    var conveyance = (_b = record.conveyanceOverride) !== null && _b !== void 0 ? _b : employee.conveyance;
    var netPayable = employee.basicSalary
        - record.advanceDeducted
        - leaveDeduction
        - lateDeduction
        + otAddition
        + conveyance
        + record.attendanceBonus;
    return {
        employee: employee,
        record: record,
        basicSalary: employee.basicSalary,
        advanceDeducted: record.advanceDeducted,
        leaveDeduction: leaveDeduction,
        lateDeduction: lateDeduction,
        otAddition: otAddition,
        conveyance: conveyance,
        attendanceBonus: record.attendanceBonus,
        netPayable: Math.round(netPayable / 10) * 10,
        dailyRate: dailyRate,
        yearlyUsedLeave: yearlyUsedLeave,
    };
}
function calcEid(employee, record) {
    var salaryPayment = Math.round(employee.basicSalary * record.salaryPaymentPct / 100);
    var eidBonus = Math.round(employee.basicSalary * record.eidBonusPct / 100);
    var netPayable = salaryPayment - record.advanceDeducted + eidBonus;
    return {
        employee: employee,
        record: record,
        basicSalary: employee.basicSalary,
        salaryPayment: salaryPayment,
        advanceDeducted: record.advanceDeducted,
        eidBonus: eidBonus,
        netPayable: Math.round(netPayable / 10) * 10,
    };
}
function formatTaka(amount) {
    return "\u09F3 ".concat(amount.toLocaleString('en-BD'));
}
