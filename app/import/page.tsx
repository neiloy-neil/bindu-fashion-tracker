'use client'

import { useState, useRef } from 'react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

export default function ImportPage() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please upload an Excel (.xlsx) file')
      return
    }
    setFile(f)
    setError('')
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/entries/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Import Excel</h2>
          <p className="page-subtitle">Upload your Bindu Fashion Monthly Sheet .xlsx file</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Drop zone */}
          <div
            className={`drop-zone ${dragging ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div style={{ fontSize: 48, marginBottom: 16 }}>📥</div>
            {file ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-light)', marginBottom: 6 }}>
                  ✅ {file.name}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {(file.size / 1024).toFixed(1)} KB — Click to change
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  Drop your Excel file here
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  or click to browse — supports .xlsx format
                </div>
              </>
            )}
          </div>

          {/* Info box */}
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>ℹ️ Import Format</div>
            <ul style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
              <li>Upload the <strong style={{ color: 'var(--text-primary)' }}>Monthly Sales, Expenses & Payments Sheet</strong> Excel file</li>
              <li>Data starts from <strong style={{ color: 'var(--text-primary)' }}>Row 7</strong> (rows 1–5 are headers)</li>
              <li>Supports the standard 54-column Bindu Fashion format</li>
              <li>Existing entries will be <strong style={{ color: 'var(--warning)' }}>updated</strong> (upserted)</li>
              <li>All 11 branches must already exist in the system</li>
            </ul>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 8, padding: '12px 16px', marginTop: 16, color: 'var(--danger-light)', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          {result && (
            <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '20px 24px', marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-light)', marginBottom: 12 }}>
                ✅ Import Complete
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: result.errors.length > 0 ? 16 : 0 }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Imported</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-light)' }}>{result.imported}</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Skipped</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger-light)' }}>{result.skipped}</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div style={{ marginBottom: 4, fontWeight: 600 }}>Issues (first 10):</div>
                  {result.errors.map((e, i) => <div key={i} style={{ opacity: 0.7 }}>• {e}</div>)}
                </div>
              )}
            </div>
          )}

          {file && !result && (
            <button
              className="btn btn-primary w-full"
              style={{ marginTop: 20, justifyContent: 'center', padding: '14px' }}
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <BrandSpinner size={16} />
                  Importing…
                </>
              ) : '📥 Import Data'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
