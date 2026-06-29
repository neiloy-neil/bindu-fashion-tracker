'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Plus, Building2, Phone, MapPin, Building, FileText, CreditCard, Receipt, Landmark, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

// Import extracted Modals
import { PaymentMethodModal } from '@/components/parties/PaymentMethodModal'
import { PurchaseModal } from '@/components/parties/PurchaseModal'
import { PaymentModal } from '@/components/parties/PaymentModal'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function PartyProfileClient({ party: initialParty }: { party: any }) {
  // SWR Hooks for data fetching
  const { data: party, mutate: mutateParty } = useSWR(`/api/parties/${initialParty.id}`, fetcher, { 
    fallbackData: initialParty 
  })
  
  const { data: ledger, mutate: mutateLedger, isLoading: isLoadingLedger } = useSWR(
    `/api/parties/${initialParty.id}/ledger`, 
    fetcher
  )

  // Modals state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Handler for when a modal action succeeds
  const handleSuccess = () => {
    mutateParty()
    mutateLedger()
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            {party?.name || 'Party Profile'}
          </h1>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
            <Link href="/parties" className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft size={14} /> Back to Parties
            </Link>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

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
                {party.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/70">@</span>
                    <span className="font-semibold w-[76px]">Email:</span> 
                    <a href={`mailto:${party.email}`} className="text-primary hover:underline">{party.email}</a>
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

        {/* Payment Methods Card */}
        <div className="col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Landmark size={18} className="text-primary" />
              Payment Methods
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
              party.bankInfo.map((method: any) => (
                <div key={method.id} className="bg-muted/30 p-3 rounded-lg border border-border/50 text-sm relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-2">
                        {method.type === 'BANK' ? <Landmark size={14} /> : <Smartphone size={14} />}
                        {method.label || method.bankName || method.type}
                        {method.isDefault && <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium">DEFAULT</span>}
                      </p>
                      {method.type === 'BANK' && method.branchName && (
                        <p className="text-muted-foreground mt-0.5">{method.branchName} Branch</p>
                      )}
                      {method.accountName && (
                        <p className="text-muted-foreground mt-0.5">{method.accountName}</p>
                      )}
                      <div className="mt-2 space-y-1 text-xs font-mono text-muted-foreground">
                        <p><span className="text-foreground/70 font-sans">A/C:</span> {method.accountNo}</p>
                        {method.routingNo && <p><span className="text-foreground/70 font-sans">Routing:</span> {method.routingNo}</p>}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this payment method?')) return
                        try {
                          await fetch(`/api/parties/${party.id}/bank/${method.id}`, { method: 'DELETE' })
                          mutateParty()
                        } catch (e) {
                          console.error('Failed to delete', e)
                        }
                      }}
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 p-1.5 rounded-md"
                      title="Delete Payment Method"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No payment methods added yet.</p>
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

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Date</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Details</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Debit (Owed)</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Credit (Paid)</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingLedger ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[var(--text-muted)]">Loading ledger...</TableCell>
                </TableRow>
              ) : !ledger || ledger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[var(--text-muted)]">No ledger entries found.</TableCell>
                </TableRow>
              ) : (
                ledger.map((entry: any) => (
                  <TableRow key={`${entry.type}-${entry.id}`} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                    <TableCell className="whitespace-nowrap font-medium text-[var(--text-primary)]">{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      {entry.type === 'PURCHASE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--danger-subtle)]/30 text-[var(--danger)]">
                          {entry.isOpeningDue ? 'Opening Due' : 'Purchase'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--success-subtle)]/30 text-[var(--success)]">
                          Payment
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {entry.type === 'PURCHASE' ? (
                        <div className="space-y-1">
                          {entry.invoiceNumber && <p className="font-mono text-xs text-[var(--text-secondary)]">Inv: {entry.invoiceNumber}</p>}
                          {entry.note && <p className="text-[var(--text-muted)] truncate" title={entry.note}>{entry.note}</p>}
                          {entry.attachmentUrl && (
                            <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] text-xs hover:underline inline-flex items-center gap-1">
                              <FileText size={12} /> View Invoice
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-semibold text-xs text-[var(--text-primary)]">
                            {entry.method} {entry.partyBankInfo && <span className="text-[var(--text-muted)] font-normal ml-1">via {entry.partyBankInfo.label || entry.partyBankInfo.bankName || entry.partyBankInfo.type}</span>}
                          </p>
                          {entry.partyBankInfo && entry.partyBankInfo.accountNo && (
                            <p className="text-[var(--text-muted)] text-xs font-mono">A/C: {entry.partyBankInfo.accountNo}</p>
                          )}
                          {entry.transactionRef && (
                            <p className="text-[var(--text-muted)] text-xs font-mono">Ref: {entry.transactionRef}</p>
                          )}
                          {entry.branch && <p className="text-[var(--text-muted)] text-xs">Branch: {entry.branch.name}</p>}
                          {entry.note && <p className="text-[var(--text-muted)] truncate" title={entry.note}>{entry.note}</p>}
                          {entry.attachmentUrl && (
                            <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] text-xs hover:underline inline-flex items-center gap-1">
                              <FileText size={12} /> View Receipt/Cheque
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.type === 'PURCHASE' ? <span className="text-[var(--danger)] font-semibold">৳{formatCurrency(entry.amount)}</span> : <span className="text-[var(--text-muted)] opacity-50">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.type === 'PAYMENT' ? <span className="text-emerald-500 font-semibold">৳{formatCurrency(entry.amount)}</span> : <span className="text-[var(--text-muted)] opacity-50">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-[var(--text-primary)]">
                      ৳{formatCurrency(entry.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden flex flex-col divide-y divide-border">
          {isLoadingLedger ? (
            <div className="p-8 text-center text-muted-foreground">Loading ledger...</div>
          ) : !ledger || ledger.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No ledger entries found.</div>
          ) : (
            ledger.map((entry: any) => (
              <div key={`mobile-${entry.type}-${entry.id}`} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{format(new Date(entry.date), 'dd MMM yyyy')}</div>
                    <div className="mt-1">
                      {entry.type === 'PURCHASE' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-destructive/10 text-destructive uppercase tracking-wider">
                          {entry.isOpeningDue ? 'Opening Due' : 'Purchase'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 uppercase tracking-wider">
                          Payment
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Balance</p>
                    <p className="font-mono font-bold">৳{formatCurrency(entry.runningBalance)}</p>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {entry.type === 'PURCHASE' ? 'Debit (Owed)' : 'Credit (Paid)'}
                    </span>
                    <span className={`font-mono font-bold ${entry.type === 'PURCHASE' ? 'text-destructive' : 'text-emerald-500'}`}>
                      ৳{formatCurrency(entry.amount)}
                    </span>
                  </div>
                  
                  {/* Details */}
                  {entry.type === 'PURCHASE' ? (
                    <div className="space-y-1 text-sm">
                      {entry.invoiceNumber && <p className="font-mono text-xs">Inv: {entry.invoiceNumber}</p>}
                      {entry.note && <p className="text-muted-foreground text-xs">{entry.note}</p>}
                      {entry.attachmentUrl && (
                        <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline inline-flex items-center gap-1 mt-1">
                          <FileText size={12} /> View Invoice
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-xs">
                        {entry.method} {entry.partyBankInfo && <span className="text-muted-foreground font-normal ml-1">via {entry.partyBankInfo.label || entry.partyBankInfo.bankName || entry.partyBankInfo.type}</span>}
                      </p>
                      {entry.partyBankInfo && entry.partyBankInfo.accountNo && (
                        <p className="text-muted-foreground text-xs font-mono">A/C: {entry.partyBankInfo.accountNo}</p>
                      )}
                      {entry.transactionRef && (
                        <p className="text-muted-foreground text-xs font-mono">Ref: {entry.transactionRef}</p>
                      )}
                      {entry.branch && <p className="text-muted-foreground text-xs">Branch: {entry.branch.name}</p>}
                      {entry.note && <p className="text-muted-foreground text-xs">{entry.note}</p>}
                      {entry.attachmentUrl && (
                        <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline inline-flex items-center gap-1 mt-1">
                          <FileText size={12} /> View Receipt/Cheque
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <PaymentMethodModal 
        isOpen={isBankModalOpen} 
        onClose={() => setIsBankModalOpen(false)} 
        partyId={party.id} 
        onSuccess={handleSuccess} 
      />
      <PurchaseModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        partyId={party.id} 
        onSuccess={handleSuccess} 
      />
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        partyId={party.id} 
        bankAccounts={party.bankInfo || []}
        onSuccess={handleSuccess} 
      />
      </div>
    </>
  )
}
