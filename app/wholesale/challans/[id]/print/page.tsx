'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

type ChallanDetail = {
  id: number
  challanNumber: string
  date: string
  status: string
  totalAmount: number
  discount: number
  netAmount: number
  paidAtDelivery: number
  remainingDue: number
  deliveryPerson: string | null
  notes: string | null
  buyer: { name: string; contactPerson: string | null; contactNumber: string | null; address: string | null }
  branch: { name: string; address: string | null }
  items: { id: number; description: string; quantity: number | null; unitPrice: number | null; amount: number; note: string | null }[]
  payments: { id: number; amount: number; method: string; note: string | null; collectedAt: string }[]
  returns: { id: number; amount: number; reason: string | null; date: string }[]
}

export default function ChallanPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [challan, setChallan] = useState<ChallanDetail | null>(null)
  const [companyName, setCompanyName] = useState('Bindu Premium')

  useEffect(() => {
    Promise.all([
      fetch(`/api/wholesale/challans/${id}`).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/settings').then(r => r.json()).catch(() => null),
    ]).then(([c, s]) => {
      if (!c) return
      setChallan(c)
      if (s?.companyName) setCompanyName(s.companyName)
      setTimeout(() => window.print(), 600)
    })
  }, [id])

  if (!challan) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading...</div>

  const totalPaid = challan.payments.reduce((s, p) => s + p.amount, 0)
  const totalReturns = challan.returns.reduce((s, r) => s + r.amount, 0)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: '#1a1a1a' }}>

      {/* Print-only header */}
      <style>{`
        @media print {
          @page { margin: 16mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Company + Challan header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a1a1a', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>{companyName}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{challan.branch.name}{challan.branch.address ? ` · ${challan.branch.address}` : ''}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2563eb' }}>CHALLAN</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>#{challan.challanNumber}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
            {new Date(challan.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Buyer & Delivery */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Bill To</p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{challan.buyer.name}</p>
          {challan.buyer.contactPerson && <p style={{ margin: '2px 0 0', color: '#555' }}>{challan.buyer.contactPerson}</p>}
          {challan.buyer.contactNumber && <p style={{ margin: '2px 0 0', color: '#555' }}>{challan.buyer.contactNumber}</p>}
          {challan.buyer.address && <p style={{ margin: '4px 0 0', color: '#777', fontSize: 12, whiteSpace: 'pre-line' }}>{challan.buyer.address}</p>}
        </div>
        {challan.deliveryPerson && (
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Delivery By</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{challan.deliveryPerson}</p>
          </div>
        )}
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#555', borderBottom: '1px solid #ddd' }}>Description</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#555', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#555', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>Unit Price</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#555', borderBottom: '1px solid #ddd' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 1 ? '#fafafa' : 'white' }}>
              <td style={{ padding: '7px 10px', borderBottom: '1px solid #eee' }}>
                {item.description}
                {item.note && <span style={{ color: '#999', fontSize: 11, display: 'block' }}>{item.note}</span>}
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #eee', color: '#555' }}>{item.quantity ?? '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #eee', color: '#555' }}>{item.unitPrice ? formatCurrency(item.unitPrice) : '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 500 }}>{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <table style={{ minWidth: 240 }}>
          <tbody>
            {challan.discount > 0 && (
              <tr>
                <td style={{ padding: '3px 10px 3px 0', color: '#666' }}>Subtotal</td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>{formatCurrency(challan.totalAmount)}</td>
              </tr>
            )}
            {challan.discount > 0 && (
              <tr>
                <td style={{ padding: '3px 10px 3px 0', color: '#666' }}>Discount</td>
                <td style={{ padding: '3px 0', textAlign: 'right', color: '#dc2626' }}>−{formatCurrency(challan.discount)}</td>
              </tr>
            )}
            <tr style={{ borderTop: '1px solid #ddd' }}>
              <td style={{ padding: '6px 10px 3px 0', fontWeight: 700, fontSize: 14 }}>Net Total</td>
              <td style={{ padding: '6px 0 3px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{formatCurrency(challan.netAmount)}</td>
            </tr>
            {challan.paidAtDelivery > 0 && (
              <tr>
                <td style={{ padding: '3px 10px 3px 0', color: '#059669' }}>Paid at Delivery</td>
                <td style={{ padding: '3px 0', textAlign: 'right', color: '#059669' }}>{formatCurrency(challan.paidAtDelivery)}</td>
              </tr>
            )}
            {totalPaid > challan.paidAtDelivery && (
              <tr>
                <td style={{ padding: '3px 10px 3px 0', color: '#059669' }}>Total Paid</td>
                <td style={{ padding: '3px 0', textAlign: 'right', color: '#059669' }}>{formatCurrency(totalPaid)}</td>
              </tr>
            )}
            {totalReturns > 0 && (
              <tr>
                <td style={{ padding: '3px 10px 3px 0', color: '#d97706' }}>Returns</td>
                <td style={{ padding: '3px 0', textAlign: 'right', color: '#d97706' }}>−{formatCurrency(totalReturns)}</td>
              </tr>
            )}
            {challan.remainingDue > 0 && (
              <tr style={{ borderTop: '1px solid #ddd' }}>
                <td style={{ padding: '6px 10px 3px 0', fontWeight: 700, color: '#dc2626' }}>Balance Due</td>
                <td style={{ padding: '6px 0 3px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(challan.remainingDue)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {challan.notes && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginBottom: 16 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Notes</p>
          <p style={{ margin: 0, color: '#555', whiteSpace: 'pre-line' }}>{challan.notes}</p>
        </div>
      )}

      {/* Signature */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40, paddingTop: 20, borderTop: '1px solid #eee' }}>
        <div>
          <div style={{ borderBottom: '1px solid #1a1a1a', marginBottom: 6, height: 32 }}></div>
          <p style={{ margin: 0, fontSize: 11, color: '#666' }}>Authorised Signature</p>
        </div>
        <div>
          <div style={{ borderBottom: '1px solid #1a1a1a', marginBottom: 6, height: 32 }}></div>
          <p style={{ margin: 0, fontSize: 11, color: '#666' }}>Receiver Signature</p>
        </div>
      </div>

      {/* Print button */}
      <div className="no-print" style={{ marginTop: 24, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={() => window.print()} style={{ padding: '8px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          Print / Save PDF
        </button>
        <button
          onClick={async () => { const { exportChallanPdf } = await import('@/lib/report-pdf'); exportChallanPdf({ ...challan!, companyName }) }}
          style={{ padding: '8px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >
          Download PDF
        </button>
      </div>
    </div>
  )
}
