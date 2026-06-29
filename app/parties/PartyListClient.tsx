'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus, Phone, MapPin, Building2, ChevronRight, Upload, Filter, ArrowUpDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { AddPartyModal } from '@/components/parties/AddPartyModal'
import { ImportPartyModal } from '@/components/parties/ImportPartyModal'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function PartyListClient({ initialParties }: { initialParties: any[] }) {
  const [parties, setParties] = useState(initialParties)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [filterDue, setFilterDue] = useState<'ALL' | 'HAS_DUE' | 'CLEARED'>('ALL')
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'DUE_HIGH' | 'DUE_LOW'>('NAME_ASC')
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const router = useRouter()

  const handleSuccess = async () => {
    router.refresh()
    const res = await fetch('/api/parties')
    if (res.ok) {
      const data = await res.json()
      setParties(data)
    }
  }

  // Calculate Stats
  const stats = useMemo(() => {
    let totalParties = parties.length
    let withDue = 0
    let cleared = 0
    let totalOutstanding = 0

    parties.forEach(p => {
      if (p.balance > 0) {
        withDue++
        totalOutstanding += p.balance
      } else {
        cleared++
      }
    })

    return { totalParties, withDue, cleared, totalOutstanding }
  }, [parties])

  const filteredParties = useMemo(() => {
    return parties
      .filter(p => {
        // Status filter
        if (filterStatus === 'ACTIVE' && !p.isActive) return false
        if (filterStatus === 'INACTIVE' && p.isActive) return false

        // Due filter
        if (filterDue === 'HAS_DUE' && p.balance <= 0) return false
        if (filterDue === 'CLEARED' && p.balance > 0) return false

        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return (
            p.name.toLowerCase().includes(q) ||
            (p.contactPerson && p.contactPerson.toLowerCase().includes(q)) ||
            (p.contactNumber && p.contactNumber.includes(q))
          )
        }
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'NAME_ASC': return a.name.localeCompare(b.name)
          case 'NAME_DESC': return b.name.localeCompare(a.name)
          case 'DUE_HIGH': return b.balance - a.balance
          case 'DUE_LOW': return a.balance - b.balance
          default: return 0
        }
      })
  }, [parties, searchQuery, filterStatus, filterDue, sortBy])

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            Vendors & Parties
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage suppliers, track purchases, and monitor due balances.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsImporting(true)}
            variant="outline"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2"
          >
            <Upload size={16} /> Import Excel
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Party
          </Button>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium mb-1">Total Parties</p>
            <p className="text-2xl font-bold">{stats.totalParties}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium mb-1">With Due</p>
            <p className="text-2xl font-bold text-destructive">{stats.withDue}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium mb-1">Cleared / Advanced</p>
            <p className="text-2xl font-bold text-emerald-500">{stats.cleared}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold font-mono text-destructive">৳{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden flex flex-col">
          {/* Header and Controls */}
          <div className="p-4 sm:p-6 border-b border-border bg-muted/20 space-y-4">
            
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Search parties by name, contact or phone..."
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 h-10">
                  <Filter size={14} className="text-muted-foreground" />
                  <select 
                    className="bg-transparent text-sm font-medium focus:outline-none"
                    value={filterDue}
                    onChange={e => setFilterDue(e.target.value as any)}
                  >
                    <option value="ALL">All Balances</option>
                    <option value="HAS_DUE">Has Due</option>
                    <option value="CLEARED">Cleared</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 h-10">
                  <Filter size={14} className="text-muted-foreground" />
                  <select 
                    className="bg-transparent text-sm font-medium focus:outline-none"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as any)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 h-10">
                  <ArrowUpDown size={14} className="text-muted-foreground" />
                  <select 
                    className="bg-transparent text-sm font-medium focus:outline-none"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                  >
                    <option value="NAME_ASC">Name (A-Z)</option>
                    <option value="NAME_DESC">Name (Z-A)</option>
                    <option value="DUE_HIGH">Due (High to Low)</option>
                    <option value="DUE_LOW">Due (Low to High)</option>
                  </select>
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
                    <TableRow key={party.id} className={`border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors group ${!party.isActive ? 'opacity-60 grayscale' : ''}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-[var(--text-primary)]">{party.name}</div>
                          {!party.isActive && (
                            <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider">Inactive</span>
                          )}
                        </div>
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
                        {/* Mobile Balance Indicator */}
                        <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                          {party.balance > 0 ? 'Owed' : 'Cleared'}
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
        <ImportPartyModal
          isOpen={isImporting}
          onClose={() => setIsImporting(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </>
  )
}
