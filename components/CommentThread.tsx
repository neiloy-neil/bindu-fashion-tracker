'use client'

import { useState, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'

type Comment = {
  id: number
  message: string
  createdAt: string
  user: {
    username: string
    role: string
  }
}

export default function CommentThread({ entryId, branchName, date, onClose }: { entryId: number, branchName: string, date: string, onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/entries/${entryId}/comments`)
      .then(r => r.json())
      .then(data => {
        setComments(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [entryId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/entries/${entryId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
      setMessage('')
    } catch {
      toast.error('Failed to send comment')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl z-[100] flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)]">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">💬 Entry Discussion</h3>
          <p className="text-xs text-[var(--text-secondary)]">{branchName} - {new Date(date).toLocaleDateString()}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[var(--border)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[var(--bg-primary)]">
        {loading ? (
          <div className="text-center text-[var(--text-secondary)] py-10">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] py-10">No comments yet. Start the discussion!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className={`flex flex-col ${c.user.role === 'ADMIN' ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">
                {c.user.username} ({c.user.role}) • {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${c.user.role === 'ADMIN' ? 'bg-[var(--accent)] text-[var(--bg-card)] rounded-tr-sm' : 'bg-[var(--border)] text-[var(--text-primary)] rounded-tl-sm'}`}>
                {c.message}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)] flex gap-2">
        <input 
          type="text" 
          className="flex h-10 w-full flex-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
          placeholder="Type a message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <Button 
          type="submit" 
          disabled={!message.trim() || sending}
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
        >
          <Send size={16} className={sending ? 'opacity-50' : ''} />
        </Button>
      </form>
    </div>
  )
}
