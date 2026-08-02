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

export default function WhatsAppReportCard({ entryData, branchName, selectedDate }: Props) {
  const openingBalance = entryData.items?.find((i: any) => i.category?.name === 'Opening Balance')?.amount ?? 0
  const receivedTransfers = entryData.receivedTransfers ?? []

  const incomeItems = (entryData.items ?? []).filter(
    (i: any) => i.category?.type === 'INCOME' && i.category?.name !== 'Opening Balance' && i.category?.name !== 'Branch Transfer Received' && i.amount > 0
  )
  const expenseEntries = (entryData.expenseEntries ?? []).filter((e: any) => !e.isTransferEntry)
  const transfers = entryData.transfers ?? []
  const payments = entryData.payments ?? []
  const advances = (entryData.advanceSalaries ?? []).filter((a: any) => a.type === 'CASH')

  const totalSale = incomeItems.reduce((s: number, i: any) => s + i.amount, 0)
    + receivedTransfers.reduce((s: number, t: any) => s + t.amount, 0)
  const totalIncome = openingBalance + totalSale
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: accent ? '#4ade80' : '#e2e8f0' }}>{value}</span>
    </div>
  )

  return (
    <div style={{
      width: 420,
      background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: 20,
      padding: '28px 28px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
          Daily Report
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, marginBottom: 4 }}>
          {branchName}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{formatDate(selectedDate)}</div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, #334155, transparent)', marginBottom: 20 }} />

      {/* Big 3 stat pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>Total Sale</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#4ade80' }}>{fmt(totalSale)}</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>Total Expense</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#f87171' }}>{fmt(grandOutflow)}</div>
        </div>
        <div style={{ flex: 1, background: cashInHand >= 0 ? 'rgba(96,165,250,0.10)' : 'rgba(248,113,113,0.10)', border: `1px solid ${cashInHand >= 0 ? 'rgba(96,165,250,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: cashInHand >= 0 ? '#60a5fa' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 600 }}>Cash in Hand</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: cashInHand >= 0 ? '#60a5fa' : '#f87171' }}>{fmt(cashInHand)}</div>
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '4px 14px 2px' }}>
        <Row label="Opening Balance" value={fmt(openingBalance)} />
        <Row label="Total Sale (excl. opening)" value={fmt(totalSale)} accent />
        {receivedTransfers.length > 0 && (
          <Row label={`Transfers Received (${receivedTransfers.length})`} value={fmt(receivedTransfers.reduce((s: number, t: any) => s + t.amount, 0))} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Discrepancy</span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: discrepancy >= 0 ? '#4ade80' : '#f87171' }}>
              {discrepancy >= 0 ? '+' : ''}{fmt(discrepancy)}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 18, fontSize: 10, color: '#334155', textAlign: 'center', letterSpacing: '0.05em' }}>
        Bindu Premium Fashion · Generated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}
