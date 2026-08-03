'use client'

import { formatCurrency } from '@/lib/utils'

interface Props {
  entryData: any
  branchName: string
  selectedDate: string
}

function fmt(n: number) {
  return '৳' + formatCurrency(n)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const SALE_CATEGORIES = new Set([
  'Cash Sale', 'Bkash', 'Nagad', 'Rocket Income',
  'POS Brac', 'POS City', 'POS DBBL', 'POS Pubali',
])

export default function WhatsAppReportCard({ entryData, branchName, selectedDate }: Props) {
  const openingBalance = entryData.items?.find((i: any) => i.category?.name === 'Opening Balance')?.amount ?? 0
  const receivedTransfers = entryData.receivedTransfers ?? []

  // Only actual cash/digital sales count toward Total Sale
  const incomeItems = (entryData.items ?? []).filter(
    (i: any) => i.category?.type === 'INCOME' && SALE_CATEGORIES.has(i.category?.name) && i.amount > 0
  )
  const expenseEntries = (entryData.expenseEntries ?? []).filter((e: any) => !e.isTransferEntry)
  const transfers = entryData.transfers ?? []
  const payments = entryData.payments ?? []
  const advances = (entryData.advanceSalaries ?? []).filter((a: any) => a.type === 'CASH')

  const totalSale = incomeItems.reduce((s: number, i: any) => s + i.amount, 0)
  const totalTransfersReceived = receivedTransfers.reduce((s: number, t: any) => s + t.amount, 0)
  const totalIncome = openingBalance + totalSale + totalTransfersReceived
  const totalExpenses = expenseEntries.reduce((s: number, e: any) => s + e.amount, 0)
  const totalTransfers = transfers.reduce((s: number, t: any) => s + t.amount, 0)
  const totalPayments = payments.reduce((s: number, p: any) => s + p.amount, 0)
  const totalAdvance = advances.reduce((s: number, a: any) => s + (a.amount ?? 0), 0)
  const grandOutflow = totalExpenses + totalTransfers + totalPayments + totalAdvance
  const cashInHand = totalIncome - grandOutflow

  const expectedNet = entryData.expectedNetBalance ?? cashInHand
  const physicalCash = entryData.actualPhysicalCash
  const discrepancy = physicalCash != null ? physicalCash - expectedNet : null

  const Row = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: accent ? '#15803d' : '#1e293b' }}>{value}</span>
    </div>
  )

  return (
    <div style={{
      width: 420,
      background: '#ffffff',
      borderRadius: 20,
      padding: '28px 28px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1e293b',
      boxSizing: 'border-box',
      border: '1px solid #e2e8f0',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
          Daily Report
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginBottom: 3 }}>
          {branchName}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(selectedDate)}</div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#e2e8f0', marginBottom: 18 }} />

      {/* Big 3 stat pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>Total Sale</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#15803d' }}>{fmt(totalSale)}</div>
        </div>
        <div style={{ flex: 1, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>Total Expense</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#b91c1c' }}>{fmt(grandOutflow)}</div>
        </div>
        <div style={{ flex: 1, background: cashInHand >= 0 ? '#eff6ff' : '#fff1f2', border: `1px solid ${cashInHand >= 0 ? '#bfdbfe' : '#fecdd3'}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: cashInHand >= 0 ? '#2563eb' : '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>Cash in Hand</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: cashInHand >= 0 ? '#1d4ed8' : '#b91c1c' }}>{fmt(cashInHand)}</div>
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '4px 14px 2px', border: '1px solid #e2e8f0' }}>
        <Row label="Opening Balance" value={fmt(openingBalance)} />
        <Row label="Total Sale (excl. opening)" value={fmt(totalSale)} accent />
        {receivedTransfers.length > 0 && (
          <Row label={`Transfers Received (${receivedTransfers.length})`} value={fmt(totalTransfersReceived)} />
        )}
        <Row label="Total Inflow" value={fmt(totalIncome)} />
        <Row label="Expenses" value={fmt(totalExpenses)} />
        {totalTransfers > 0 && <Row label="Branch Transfers Out" value={fmt(totalTransfers)} />}
        {totalPayments > 0 && <Row label="Party Payments" value={fmt(totalPayments)} />}
        {totalAdvance > 0 && <Row label="Salary Advances" value={fmt(totalAdvance)} />}
        {physicalCash != null && (
          <Row label="Physical Cash (counted)" value={fmt(physicalCash)} />
        )}
        {discrepancy != null && Math.abs(discrepancy) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Discrepancy</span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: discrepancy >= 0 ? '#15803d' : '#b91c1c' }}>
              {discrepancy >= 0 ? '+' : ''}{fmt(discrepancy)}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, fontSize: 10, color: '#cbd5e1', textAlign: 'center', letterSpacing: '0.05em' }}>
        Bindu Premium Fashion · Generated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}
