'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Plus, Phone, MapPin, Building2, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AddPartyModal } from '@/components/parties/AddPartyModal'
import { useRouter } from 'next/navigation'

export default function PartyListClient({ initialParties }: { initialParties: any[] }) {
  const [parties, setParties] = useState(initialParties)
  const [activeTab, setActiveTab] = useState<'ALL' | 'DUE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const router = useRouter()

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-primary" />
            Vendors & Parties
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage suppliers, track purchases, and monitor due balances.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Party
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
        {/* Header and Controls */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ALL' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('ALL')}
              >
                All Parties
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'DUE' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('DUE')}
              >
                Due List
              </button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Search parties..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="p-4 font-semibold">Company Info</th>
                <th className="p-4 font-semibold hidden sm:table-cell">Contact</th>
                <th className="p-4 font-semibold hidden md:table-cell">Location</th>
                <th className="p-4 font-semibold text-right">Total Due</th>
                <th className="p-4 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No parties found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredParties.map(party => (
                  <tr key={party.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-foreground">{party.name}</div>
                      {party.contactPerson && <div className="text-xs text-muted-foreground mt-0.5">{party.contactPerson}</div>}
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      {party.contactNumber ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone size={14} />
                          {party.contactNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </td>
                    <td className="p-4 hidden md:table-cell max-w-[200px] truncate">
                      {party.address ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground" title={party.address}>
                          <MapPin size={14} className="shrink-0" />
                          <span className="truncate">{party.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className={`font-bold font-mono ${party.balance > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                        ৳{formatCurrency(party.balance)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/parties/${party.id}`}>
                        <button className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium text-xs rounded-md transition-colors flex items-center gap-1 ml-auto">
                          View Details <ChevronRight size={14} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddPartyModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={handleSuccess} 
      />
    </div>
  )
}
