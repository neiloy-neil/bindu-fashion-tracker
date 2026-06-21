import os

content = """'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Building2, Phone, MapPin, Building, FileText, Upload, CreditCard, Receipt } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '@/lib/supabase'

export default function PartyProfileClient({ party: initialParty }: { party: any }) {
  const [party, setParty] = useState(initialParty)
  const [ledger, setLedger] = useState<any[]>([])
  const [isLoadingLedger, setIsLoadingLedger] = useState(true)

  // Modals state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const fetchLedger = async () => {
    try {
      const res = await fetch(`/api/parties/${party.id}/ledger`)
      if (!res.ok) throw new Error('Failed to fetch ledger')
      const data = await res.json()
      setLedger(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoadingLedger(false)
    }
  }

  const fetchParty = async () => {
    const res = await fetch(`/api/parties/${party.id}`)
    if (res.ok) setParty(await res.json())
  }

  useEffect(() => {
    fetchLedger()
  }, [])

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-20">
      <Link href="/parties" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors w-fit">
        <ArrowLeft size={16} />
        <span className="text-sm font-medium">Back to Parties</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile Card */}
        <div className="col-span-1 lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="text-primary" />
                {party.name}
              </h1>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {party.contactPerson && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-24">Contact:</span> {party.contactPerson}
                  </div>
                )}
                {party.contactNumber && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-muted-foreground/70" />
                    <span className="font-semibold w-[76px]">Phone:</span> {party.contactNumber}
                  </div>
                )}
                {party.secondaryNumber && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-muted-foreground/70" />
                    <span className="font-semibold w-[76px]">Alt Phone:</span> {party.secondaryNumber}
                  </div>
                )}
                {party.address && (
                  <div className="flex items-start gap-2 pt-1">
                    <MapPin size={14} className="text-muted-foreground/70 mt-0.5" />
                    <span className="font-semibold w-[76px] shrink-0">Address:</span> 
                    <span>{party.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Due</p>
              <p className={`text-3xl font-bold font-mono ${party.balance > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                ৳{formatCurrency(party.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Bank Info Card */}
        <div className="col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Building size={18} className="text-primary" />
              Bank Information
            </h2>
            <button 
              onClick={() => setIsBankModalOpen(true)}
              className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded-md font-medium"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {party.bankInfo && party.bankInfo.length > 0 ? (
              party.bankInfo.map((bank: any) => (
                <div key={bank.id} className="bg-muted/30 p-3 rounded-lg border border-border/50 text-sm">
                  <p className="font-bold text-foreground">{bank.bankName}</p>
                  <p className="text-muted-foreground mt-0.5">{bank.branchName} Branch</p>
                  <div className="mt-2 space-y-1 text-xs font-mono text-muted-foreground">
                    <p><span className="text-foreground/70 font-sans">A/C:</span> {bank.accountNo}</p>
                    {bank.routingNo && <p><span className="text-foreground/70 font-sans">Routing:</span> {bank.routingNo}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No bank information added yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Section */}
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="text-primary" />
            Party Ledger
          </h2>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setIsPurchaseModalOpen(true)}
              className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <Receipt size={16} />
              Add Purchase / Due
            </button>
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <CreditCard size={16} />
              Make Payment
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="p-4 font-semibold whitespace-nowrap">Date</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Details</th>
                <th className="p-4 font-semibold text-right">Debit (Owed)</th>
                <th className="p-4 font-semibold text-right">Credit (Paid)</th>
                <th className="p-4 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingLedger ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">Loading ledger...</td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No ledger entries found.</td>
                </tr>
              ) : (
                ledger.map((entry, idx) => (
                  <tr key={`${entry.type}-${entry.id}`} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 whitespace-nowrap font-medium">{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                    <td className="p-4">
                      {entry.type === 'PURCHASE' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive">
                          {entry.isOpeningDue ? 'Opening Due' : 'Purchase'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600">
                          Payment
                        </span>
                      )}
                    </td>
                    <td className="p-4 max-w-xs">
                      {entry.type === 'PURCHASE' ? (
                        <div className="space-y-1">
                          {entry.invoiceNumber && <p className="font-mono text-xs">Inv: {entry.invoiceNumber}</p>}
                          {entry.note && <p className="text-muted-foreground truncate" title={entry.note}>{entry.note}</p>}
                          {entry.attachmentUrl && (
                            <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline inline-flex items-center gap-1">
                              <FileText size={12} /> View Invoice
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-semibold text-xs">{entry.method}</p>
                          {entry.branch && <p className="text-muted-foreground text-xs">Branch: {entry.branch.name}</p>}
                          {entry.note && <p className="text-muted-foreground truncate" title={entry.note}>{entry.note}</p>}
                          {entry.attachmentUrl && (
                            <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline inline-flex items-center gap-1">
                              <FileText size={12} /> View Receipt/Cheque
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {entry.type === 'PURCHASE' ? <span className="text-destructive font-semibold">৳{formatCurrency(entry.amount)}</span> : '-'}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {entry.type === 'PAYMENT' ? <span className="text-emerald-500 font-semibold">৳{formatCurrency(entry.amount)}</span> : '-'}
                    </td>
                    <td className="p-4 text-right font-mono font-bold">
                      ৳{formatCurrency(entry.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BankModal isOpen={isBankModalOpen} onClose={() => setIsBankModalOpen(false)} partyId={party.id} onSuccess={fetchParty} />
      <PurchaseModal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} partyId={party.id} onSuccess={() => { fetchParty(); fetchLedger() }} />
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} partyId={party.id} onSuccess={() => { fetchParty(); fetchLedger() }} />
    </div>
  )
}

function BankModal({ isOpen, onClose, partyId, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ bankName: '', branchName: '', accountNo: '', routingNo: '' })

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/parties/${partyId}/bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add bank info')
      }
      toast.success('Bank info added successfully')
      onSuccess()
      onClose()
      setFormData({ bankName: '', branchName: '', accountNo: '', routingNo: '' })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 sm:p-8 rounded-2xl shadow-2xl z-50 border border-border">
          <Dialog.Title className="text-xl font-bold mb-6">Add Bank Information</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name</label>
              <input required className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch Name</label>
              <input required className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input required className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.accountNo} onChange={e => setFormData({...formData, accountNo: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Routing Number <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <input className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.routingNo} onChange={e => setFormData({...formData, routingNo: e.target.value})} />
            </div>
            <div className="flex gap-3 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50">Save</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PurchaseModal({ isOpen, onClose, partyId, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    invoiceNumber: '',
    note: '',
    isOpeningDue: false
  })

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (parseFloat(formData.amount) <= 0) return toast.error('Amount must be positive')
    
    setLoading(true)
    try {
      let attachmentUrl = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `invoices/${fileName}`
        
        const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        
        const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
        attachmentUrl = data.publicUrl
      }

      const payload = {
        partyId,
        amount: parseFloat(formData.amount),
        date: formData.date,
        invoiceNumber: formData.invoiceNumber,
        note: formData.note,
        isOpeningDue: formData.isOpeningDue,
        attachmentUrl
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add purchase')
      }

      toast.success('Purchase added successfully')
      onSuccess()
      onClose()
      setFormData({ date: new Date().toISOString().split('T')[0], amount: '', invoiceNumber: '', note: '', isOpeningDue: false })
      setFile(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 sm:p-8 rounded-2xl shadow-2xl z-50 border border-border">
          <Dialog.Title className="text-xl font-bold mb-6">Add Purchase / Opening Due</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg border border-border">
              <input 
                type="checkbox" 
                id="isOpeningDue" 
                checked={formData.isOpeningDue} 
                onChange={e => setFormData({...formData, isOpeningDue: e.target.checked})}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50 bg-background"
              />
              <label htmlFor="isOpeningDue" className="text-sm font-medium cursor-pointer">This is an Opening Due balance</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (৳)</label>
                <input required type="number" step="0.01" min="0.01" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm font-mono" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
            </div>

            {!formData.isOpeningDue && (
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Number <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Note <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <textarea className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>

            {!formData.isOpeningDue && (
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Photo <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full p-2 text-sm border border-border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PaymentModal({ isOpen, onClose, partyId, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    method: 'CASH',
    amount: '',
    note: '',
    issueDate: new Date().toISOString().split('T')[0],
    withdrawDate: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (parseFloat(formData.amount) <= 0) return toast.error('Amount must be positive')
    if ((formData.method === 'BANK' || formData.method === 'CHEQUE') && !file) {
      return toast.error('Attachment is required for BANK or CHEQUE')
    }
    
    setLoading(true)
    try {
      let attachmentUrl = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `receipts/${fileName}`
        
        const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        
        const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
        attachmentUrl = data.publicUrl
      }

      const payload = {
        partyId,
        method: formData.method,
        amount: parseFloat(formData.amount),
        note: formData.note,
        attachmentUrl,
        ...(formData.method === 'CHEQUE' && {
          issueDate: formData.issueDate,
          withdrawDate: formData.withdrawDate
        })
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to make payment')
      }

      toast.success('Payment recorded successfully')
      onSuccess()
      onClose()
      setFormData({ method: 'CASH', amount: '', note: '', issueDate: new Date().toISOString().split('T')[0], withdrawDate: new Date().toISOString().split('T')[0] })
      setFile(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 sm:p-8 rounded-2xl shadow-2xl z-50 border border-border">
          <Dialog.Title className="text-xl font-bold mb-6">Make Direct Payment</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select 
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" 
                  value={formData.method} 
                  onChange={e => setFormData({...formData, method: e.target.value})}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (৳)</label>
                <input required type="number" step="0.01" min="0.01" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm font-mono" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
            </div>

            {formData.method === 'CHEQUE' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Issue Date</label>
                  <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Withdraw Date</label>
                  <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.withdrawDate} onChange={e => setFormData({...formData, withdrawDate: e.target.value})} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Note <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <textarea className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>

            {(formData.method === 'BANK' || formData.method === 'CHEQUE') && (
              <div>
                <label className="block text-sm font-medium mb-1">Attachment <span className="text-destructive">*</span></label>
                <input 
                  required
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full p-2 text-sm border border-border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50">
                {loading ? 'Processing...' : 'Pay'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
"""

with open('app/parties/[id]/PartyProfileClient.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
