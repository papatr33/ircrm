'use client'

import { useState } from 'react'
import { Contact } from '@/types'
import { User, Mail, Phone, MapPin, FileText, Loader2 } from 'lucide-react'

interface ContactFormProps {
  initialData?: Partial<Contact>
  onSubmit: (data: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  submitLabel?: string
}

export default function ContactForm({ initialData, onSubmit, submitLabel = 'Save' }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    location: initialData?.location || '',
    details: initialData?.details || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!formData.name.trim()) {
      setError('Name is required')
      setLoading(false)
      return
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        location: formData.location.trim() || null,
        details: formData.details.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-slate-400">
          Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="input-field pl-12"
            placeholder="Contact name"
            required
          />
        </div>
      </div>

      {/* Email & Phone - side by side on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-400">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field pl-12"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-400">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="input-field pl-12"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label htmlFor="location" className="block text-sm font-medium text-slate-400">
          Location
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input
            id="location"
            name="location"
            type="text"
            value={formData.location}
            onChange={handleChange}
            className="input-field pl-12"
            placeholder="City, Country"
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <label htmlFor="details" className="block text-sm font-medium text-slate-400">
          Notes
        </label>
        <div className="relative">
          <FileText className="absolute left-4 top-3.5 text-slate-600" size={18} />
          <textarea
            id="details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            className="input-field pl-12 min-h-[120px] resize-y"
            placeholder="Add notes about this contact..."
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          submitLabel
        )}
      </button>
    </form>
  )
}
