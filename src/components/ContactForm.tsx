'use client'

import { useState } from 'react'
import { Contact } from '@/types'
import { User, Mail, Phone, MapPin, FileText, Loader2, Building2, Calendar, Star } from 'lucide-react'

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
    institution: initialData?.institution || '',
    last_interaction_date: initialData?.last_interaction_date || '',
    priority: initialData?.priority?.toString() || '',
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
        institution: formData.institution.trim() || null,
        last_interaction_date: formData.last_interaction_date || null,
        priority: formData.priority ? parseInt(formData.priority) : null,
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
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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

      {/* Institution & Location - side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
            Institution
          </label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              id="institution"
              name="institution"
              type="text"
              value={formData.institution}
              onChange={handleChange}
              className="input-field pl-12"
              placeholder="Company or fund name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
      </div>

      {/* Last Interaction Date & Priority - side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="last_interaction_date" className="block text-sm font-medium text-gray-700">
            Last Interaction
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              id="last_interaction_date"
              name="last_interaction_date"
              type="date"
              value={formData.last_interaction_date}
              onChange={handleChange}
              className="input-field pl-12 cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <div className="relative">
            <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="input-field pl-12 appearance-none cursor-pointer pr-10"
            >
              <option value="">Select priority</option>
              <option value="1">1 - Highest</option>
              <option value="2">2 - High</option>
              <option value="3">3 - Medium</option>
              <option value="4">4 - Low</option>
              <option value="5">5 - Lowest</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <label htmlFor="details" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <div className="relative">
          <FileText className="absolute left-4 top-3.5 text-gray-400" size={18} />
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
