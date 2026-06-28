'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, Filter, Plus, Phone, MapPin, Building2, ChevronRight, Upload } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { AddPartyModal } from '@/components/parties/AddPartyModal'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function PartyListClient({ initialParties }: { initialParties: any[] }) {
  const [parties, setParties] = useState(initialParties)
  const [activeTab, setActiveTab] = useState<'ALL' | 'DUE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    const toastId = toast.loading('Importing parties...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parties/import', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()

      if (res.ok) {
        toast.success(`Imported ${result.summary.created} parties. ${result.summary.errors.length > 0 ? 'Some errors occurred.' : ''}`, { id: toastId })
        if (result.summary.errors.length > 0) {
          console.warn('Import errors:', result.summary.errors)
        }
        handleSuccess()
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSuccess = async () => {
    router.refresh()
    const res = await fetch('/api/parties')
    if (res.ok) {
      const data = await res.json()
      setParties(data)
    }
  }

  const filteredParties = parties.filter(p => {
    const matchesTab = activeTab === 'ALL' || (activeTab === 'DUE' && p.balance > 0)
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.contactPerson && p.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.contactNumber && p.contactNumber.includes(searchQuery))
    
    return matchesTab && matchesSearch
  })

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            Vendors & Parties
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage suppliers, track purchases, and monitor due balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImport}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload size={16} /> {isImporting ? 'Importing...' : 'Import Excel'}
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} /> Add Party
          </Button>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden flex flex-col">
        {/* Header and Controls */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
              <Button
                variant={activeTab === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-md"
                onClick={() => setActiveTab('ALL')}
              >
                All Parties
              </Button>
              <Button
                variant={activeTab === 'DUE' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-md"
                onClick={() => setActiveTab('DUE')}
              >
                Due List
              </Button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Search parties..."
                  className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Company Info</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Contact</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide hidden md:table-cell">Location</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Total Due</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    No parties found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParties.map(party => (
                  <TableRow key={party.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors group">
                    <TableCell>
                      <div className="font-bold text-[var(--text-primary)]">{party.name}</div>
                      {party.contactPerson && <div className="text-xs text-[var(--text-muted)] mt-0.5">{party.contactPerson}</div>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {party.contactNumber ? (
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Phone size={14} />
                          {party.contactNumber}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] opacity-50">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                      {party.address ? (
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]" title={party.address}>
                          <MapPin size={14} className="shrink-0" />
                          <span className="truncate">{party.address}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] opacity-50">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`font-bold font-mono ${party.balance > 0 ? 'text-[var(--danger)]' : 'text-emerald-500'}`}>
                        ৳{formatCurrency(party.balance)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="secondary" size="sm" className="flex items-center gap-1 ml-auto text-xs h-8">
                        <Link href={`/parties/${party.id}`}>
                          View Details <ChevronRight size={14} />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AddPartyModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={handleSuccess} 
      />
      </div>
    </>
  )
}
