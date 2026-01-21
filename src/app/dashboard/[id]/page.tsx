'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Contact, Attachment } from '@/types'
import Navbar from '@/components/Navbar'
import ContactForm from '@/components/ContactForm'
import FileUpload from '@/components/FileUpload'
import { ArrowLeft, Trash2, Edit2, X, Mail, Phone, MapPin, Loader2, AlertCircle, Paperclip, Building2, Calendar, Star } from 'lucide-react'

// Format date for display
function formatInteractionDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Priority label helper
function getPriorityLabel(priority: number | null): string {
  if (!priority) return ''
  switch (priority) {
    case 1: return 'Highest'
    case 2: return 'High'
    case 3: return 'Medium'
    case 4: return 'Low'
    case 5: return 'Lowest'
    default: return ''
  }
}

// Priority color helper
function getPriorityColor(priority: number | null): string {
  if (!priority) return ''
  switch (priority) {
    case 1: return 'text-red-400 bg-red-500/10'
    case 2: return 'text-orange-400 bg-orange-500/10'
    case 3: return 'text-yellow-400 bg-yellow-500/10'
    case 4: return 'text-blue-400 bg-blue-500/10'
    case 5: return 'text-slate-400 bg-slate-500/10'
    default: return 'text-slate-500'
  }
}

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string
  const supabase = createClient()

  const [contact, setContact] = useState<Contact | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      await fetchContact()
    }

    checkAuthAndFetch()
  }, [contactId, router, supabase])

  const fetchContact = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()

      if (contactError) throw contactError

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (attachmentsError) throw attachmentsError

      setContact(contactData)
      setAttachments(attachmentsData || [])
    } catch (err) {
      console.error('Error fetching contact:', err)
      setError('Failed to load contact')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (data: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('contacts')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)

    if (error) {
      throw new Error(error.message)
    }

    setContact(prev => prev ? { ...prev, ...data } : null)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this contact and all attachments?')) {
      return
    }

    setIsDeleting(true)

    try {
      if (attachments.length > 0) {
        const filePaths = attachments.map(a => a.file_path)
        await supabase.storage.from('attachments').remove(filePaths)
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)

      if (error) throw error

      router.push('/dashboard')
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete contact')
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-8"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle size={18} />
            {error || 'Contact not found'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Back link */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-8"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="space-y-6">
          {/* Contact Info Section */}
          <div className="card">
            {isEditing ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-slate-100">Edit Contact</h2>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <ContactForm 
                  initialData={contact} 
                  onSubmit={handleUpdate}
                  submitLabel="Update"
                />
              </>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl font-semibold text-slate-100">
                        {contact.name}
                      </h1>
                      {contact.priority && (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(contact.priority)}`}>
                          <Star size={12} />
                          P{contact.priority} - {getPriorityLabel(contact.priority)}
                        </span>
                      )}
                    </div>
                    {contact.institution && (
                      <p className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
                        <Building2 size={14} />
                        {contact.institution}
                      </p>
                    )}
                    {contact.location && (
                      <p className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                        <MapPin size={14} />
                        {contact.location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Contact methods & last interaction */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {contact.email && (
                    <a 
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors text-sm"
                    >
                      <Mail size={14} />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a 
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors text-sm"
                    >
                      <Phone size={14} />
                      {contact.phone}
                    </a>
                  )}
                  {contact.last_interaction_date && (
                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-slate-400 text-sm">
                      <Calendar size={14} />
                      Last interaction: {formatInteractionDate(contact.last_interaction_date)}
                    </span>
                  )}
                </div>

                {/* Details */}
                {contact.details ? (
                  <div>
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Notes</h3>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {contact.details}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-600 text-sm italic">
                    No notes added
                  </p>
                )}
              </>
            )}
          </div>

          {/* Files Section - Below Contact Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Paperclip className="text-slate-500" size={18} />
              <h2 className="text-lg font-medium text-slate-100">
                Files
              </h2>
              {attachments.length > 0 && (
                <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-400">
                  {attachments.length}
                </span>
              )}
            </div>
            <FileUpload
              contactId={contactId}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
