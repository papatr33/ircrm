'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ContactForm from '@/components/ContactForm'
import { ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-xl mx-auto px-6 py-10">
        {/* Back link */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-8"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-100">
            New Contact
          </h1>
        </div>

        {/* Form */}
        <div className="card">
          <ContactForm onSubmit={handleSubmit} submitLabel="Create Contact" />
        </div>
      </main>
    </div>
  )
}
