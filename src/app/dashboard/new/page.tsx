'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ContactForm from '@/components/ContactForm'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { Contact } from '@/types'

export default function NewContactPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleSubmit = async (data: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        ...data,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    router.push(`/dashboard/${newContact.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Back to contacts
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <UserPlus className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              New Contact
            </h1>
            <p className="text-gray-500 text-sm">Add a new investor to your CRM</p>
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <ContactForm onSubmit={handleSubmit} submitLabel="Create Contact" />
        </div>
      </main>
    </div>
  )
}
