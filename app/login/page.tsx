'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f18] text-white">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#131b2c] shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-[rgba(30,45,69,0.8)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00d2ff] to-[#3a7bd5] bg-clip-text text-transparent">
            Bindu Fashion
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Log in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Username</label>
            <input
              type="text"
              required
              className="w-full bg-[#0a0f18] border border-[rgba(30,45,69,0.5)] rounded-lg p-3 text-white focus:outline-none focus:border-[#00d2ff] transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-[#0a0f18] border border-[rgba(30,45,69,0.5)] rounded-lg p-3 text-white focus:outline-none focus:border-[#00d2ff] transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-gradient-to-r from-[#00d2ff] to-[#3a7bd5] hover:opacity-90 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
