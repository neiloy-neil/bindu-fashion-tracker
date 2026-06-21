import { prisma } from './prisma'

export async function logAudit(params: {
  userId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: number;
  oldValues?: any;
  newValues?: any;
  reason?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        reason: params.reason,
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // We intentionally don't throw here to avoid failing the main transaction if logging fails, 
    // though in strict financial systems you might want to fail the transaction.
  }
}
