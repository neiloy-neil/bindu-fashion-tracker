'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
  group?: string
}

interface Props {
  options: Option[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  searchPlaceholder?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className,
  searchPlaceholder = 'Search…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const selected = options.find(o => o.value === value)

  // Position the portal dropdown — flips upward if more space above
  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const preferred = 400 // desired max height
    if (spaceBelow >= preferred || spaceBelow >= spaceAbove) {
      // Open downward
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        minWidth: 180,
        maxHeight: Math.min(preferred, spaceBelow),
        zIndex: 9999,
      })
    } else {
      // Flip upward
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        minWidth: 180,
        maxHeight: Math.min(preferred, spaceAbove),
        zIndex: 9999,
      })
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return
    const handler = () => updatePosition()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open])

  // Focus search when opening
  useEffect(() => {
    if (open) {
      updatePosition()
      setQuery('')
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  // Group options if any have a group field
  const hasGroups = options.some(o => o.group)
  const groups: Record<string, Option[]> = {}
  if (hasGroups) {
    for (const o of filtered) {
      const g = o.group ?? ''
      if (!groups[g]) groups[g] = []
      groups[g].push(o)
    }
  }

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  const dropdownEl = open ? (
    <div
      ref={dropdownRef}
      id={id}
      role="listbox"
      style={dropdownStyle}
      className={cn(
        'rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden',
        'animate-in fade-in-0 zoom-in-95'
      )}
    >
      {/* Search input */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Search size={13} className="shrink-0 text-[var(--text-muted)]" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
      </div>

      {/* Options */}
      <div className="overflow-y-auto py-1" style={{ maxHeight: 'calc(100% - 41px)' }}>
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">No results</div>
        ) : hasGroups ? (
          Object.entries(groups).map(([group, opts]) => (
            <div key={group}>
              {group && (
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {group}
                </div>
              )}
              {opts.map(o => (
                <OptionItem key={o.value} option={o} selected={value === o.value} onSelect={handleSelect} />
              ))}
            </div>
          ))
        ) : (
          filtered.map(o => (
            <OptionItem key={o.value} option={o} selected={value === o.value} onSelect={handleSelect} />
          ))
        )}
      </div>
    </div>
  ) : null

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          'disabled:opacity-50 disabled:pointer-events-none',
          open && 'ring-2 ring-[var(--accent)] border-[var(--accent)]'
        )}
      >
        <span className={cn('truncate', !selected && 'text-[var(--text-muted)]')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={14} className={cn('ml-2 shrink-0 text-[var(--text-muted)] transition-transform', open && 'rotate-180')} />
      </button>

      {typeof window !== 'undefined' && dropdownEl && createPortal(dropdownEl, document.body)}
    </div>
  )
}

function OptionItem({ option, selected, onSelect }: { option: Option; selected: boolean; onSelect: (v: string) => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(option.value)}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
        'hover:bg-[var(--surface-raised)] focus-visible:bg-[var(--surface-raised)] outline-none',
        selected && 'text-[var(--accent)] font-medium'
      )}
    >
      <Check size={13} className={cn('shrink-0', selected ? 'opacity-100 text-[var(--accent)]' : 'opacity-0')} />
      {option.label}
    </button>
  )
}
