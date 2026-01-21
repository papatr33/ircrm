'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { LogOut, Users } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
              <Users className="text-white" size={20} />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-gray-900">
                IR<span className="text-indigo-600">CRM</span>
              </span>
              <p className="text-xs text-gray-400 -mt-0.5">Investor Relations</p>
            </div>
          </Link>

          {/* Actions */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
