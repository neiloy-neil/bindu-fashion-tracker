'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Category } from '@/lib/types'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [isActive, setIsActive] = useState(true)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (err) {
      toast.error('Failed to load categories')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, isActive })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success(editingCategory ? 'Category updated' : 'Category created')
      setShowModal(false)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? Data using this category will be orphaned.')) return
    
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete')
      }
      toast.success('Category deleted')
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const openNew = () => {
    setEditingCategory(null)
    setName('')
    setType('EXPENSE')
    setIsActive(true)
    setShowModal(true)
  }

  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setName(cat.name)
    setType(cat.type)
    setIsActive(cat.isActive)
    setShowModal(true)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Manage Categories</h2>
          <p className="page-subtitle">Add or edit income and expense categories</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={18} /> New Category
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: 12 }}>
            <BrandSpinner />
            <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>
                      {cat.name}
                      {cat.isDefault && <span className="ml-2 text-xs bg-[#1e2d45] text-[#8899aa] px-2 py-1 rounded">System</span>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${cat.type === 'INCOME' ? 'badge-green' : 'badge-red'}`}>
                        {cat.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {cat.isActive ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <CheckCircle2 size={16} /> Active
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <XCircle size={16} /> Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => openEdit(cat)} className="p-2 text-[#8899aa] hover:text-white transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      {!cat.isDefault && (
                        <button onClick={() => handleDelete(cat.id)} className="p-2 text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors ml-2" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e2d45] rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#1e2d45] flex justify-between items-center bg-[#0a1628]">
              <h3 className="font-bold text-white text-lg">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8899aa] hover:text-white transition-colors text-xl font-bold px-2">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  className="form-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Snack/Tea"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select 
                  className="form-input" 
                  value={type} 
                  onChange={e => setType(e.target.value as 'INCOME'|'EXPENSE')}
                  disabled={editingCategory?.isDefault} // Don't allow changing type of system defaults
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              <div className="form-group flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={isActive} 
                  onChange={e => setIsActive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-white cursor-pointer">
                  Active (Visible in Daily Entry form)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1e2d45]">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
