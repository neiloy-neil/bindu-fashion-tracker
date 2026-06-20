'use client'

import { useState, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import toast from 'react-hot-toast'

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
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#0a0f18] border-l border-[#1e2d45] shadow-2xl z-[100] flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-[#1e2d45] flex justify-between items-center bg-[#162033]">
        <div>
          <h3 className="font-bold text-[#f0f4ff] flex items-center gap-2">💬 Entry Discussion</h3>
          <p className="text-xs text-[#8899aa]">{branchName} - {new Date(date).toLocaleDateString()}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#1e2d45] rounded-full text-[#8899aa] hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#050810]">
        {loading ? (
          <div className="text-center text-[#8899aa] py-10">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-[#8899aa] py-10">No comments yet. Start the discussion!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className={`flex flex-col ${c.user.role === 'ADMIN' ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] text-[#8899aa] mb-1 px-1">
                {c.user.username} ({c.user.role}) • {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${c.user.role === 'ADMIN' ? 'bg-[#00d2ff] text-[#0a0f18] rounded-tr-sm' : 'bg-[#1e2d45] text-[#f0f4ff] rounded-tl-sm'}`}>
                {c.message}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-[#1e2d45] bg-[#0a0f18] flex gap-2">
        <input 
          type="text" 
          className="form-input flex-1 bg-[#162033] focus:ring-2 focus:ring-[#00d2ff] rounded-full px-4"
          placeholder="Type a message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={!message.trim() || sending}
          className="bg-[#00d2ff] hover:bg-[#00a8cc] disabled:bg-[#1e2d45] disabled:text-[#8899aa] text-[#0a0f18] w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        >
          <Send size={16} className={sending ? 'opacity-50' : ''} />
        </button>
      </form>
    </div>
  )
}
