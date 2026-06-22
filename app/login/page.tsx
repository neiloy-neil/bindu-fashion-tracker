'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'
import Image from 'next/image'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await signIn('credentials', {
        redirect: false,
        username,
        password,
      })

      if (res?.error) {
        toast.error('Invalid username or password')
      } else {
        toast.success('Logged in successfully!')
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden px-4">
      
      {/* Watermark Logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0">
        <Image src="/bindu-logo.webp" alt="Swirl Watermark" width={800} height={800} className="object-contain" />
      </div>

      <div className="w-full max-w-md p-10 rounded-2xl bg-[var(--bg-card)] shadow-2xl border border-[var(--border)] relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <Image src="/bindu-logo.webp" alt="Bindu Premium Logo" width={48} height={48} className="mb-4 object-contain" />
          <h1 className="text-3xl font-display font-bold text-[var(--text-primary)]">
            Bindu Premium
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 uppercase tracking-widest font-semibold">Log in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 tracking-wide">Username</label>
            <input
              type="text"
              required
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 tracking-wide">Password</label>
            <input
              type="password"
              required
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-bold rounded-lg shadow-lg shadow-[var(--accent-glow)] transition-all flex justify-center items-center mt-4"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
