'use client'

import Link from 'next/link'
import { Contact } from '@/types'
import { MapPin, Mail, Phone, Paperclip, ChevronRight, Building2, Calendar, Star } from 'lucide-react'

// Format date for display
function formatInteractionDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Priority badge colors
function getPriorityStyle(priority: number | null): { bg: string; text: string; label: string } {
  if (!priority) return { bg: '', text: '', label: '' }
  switch (priority) {
    case 1: return { bg: 'bg-red-50', text: 'text-red-600', label: 'Highest' }
    case 2: return { bg: 'bg-orange-50', text: 'text-orange-600', label: 'High' }
    case 3: return { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Medium' }
    case 4: return { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Low' }
    case 5: return { bg: 'bg-gray-50', text: 'text-gray-500', label: 'Lowest' }
    default: return { bg: 'bg-gray-50', text: 'text-gray-500', label: '' }
  }
}

interface ContactCardProps {
  contact: Contact & { attachment_count?: number }
}

export default function ContactCard({ contact }: ContactCardProps) {
  const priorityStyle = getPriorityStyle(contact.priority)

  return (
    <Link href={`/dashboard/${contact.id}`}>
      <div className="group p-5 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Name & Priority */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {contact.name}
              </h3>
              {contact.priority && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                  <Star size={10} />
                  P{contact.priority}
                </span>
              )}
            </div>

            {/* Institution */}
            {contact.institution && (
              <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-gray-400" />
                {contact.institution}
              </p>
            )}

            {/* Details preview */}
            {contact.details && (
              <p className="text-gray-400 text-sm mt-2 line-clamp-1">
                {contact.details}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
              {contact.location && (
                <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <MapPin size={12} />
                  {contact.location}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <Mail size={12} />
                  <span className="truncate max-w-[160px]">{contact.email}</span>
                </span>
              )}
              {contact.phone && (
                <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <Phone size={12} />
                  {contact.phone}
                </span>
              )}
              {contact.last_interaction_date && (
                <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <Calendar size={12} />
                  {formatInteractionDate(contact.last_interaction_date)}
                </span>
              )}
              {contact.attachment_count && contact.attachment_count > 0 && (
                <span className="flex items-center gap-1.5 text-indigo-500 text-xs font-medium">
                  <Paperclip size={12} />
                  {contact.attachment_count}
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors flex-shrink-0">
            <ChevronRight 
              className="text-gray-300 group-hover:text-indigo-500 transition-colors" 
              size={18} 
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
