'use client'

import Link from 'next/link'
import { Contact } from '@/types'
import { MapPin, Mail, Phone, Paperclip, ChevronRight } from 'lucide-react'

interface ContactCardProps {
  contact: Contact & { attachment_count?: number }
}

export default function ContactCard({ contact }: ContactCardProps) {
  return (
    <Link href={`/dashboard/${contact.id}`}>
      <div className="group p-5 bg-slate-900/30 border border-slate-800/40 rounded-xl hover:bg-slate-800/40 hover:border-slate-700/50 transition-all duration-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="text-base font-medium text-slate-100 group-hover:text-white transition-colors">
              {contact.name}
            </h3>

            {/* Details preview */}
            {contact.details && (
              <p className="text-slate-500 text-sm mt-1.5 line-clamp-1">
                {contact.details}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {contact.location && (
                <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <MapPin size={12} />
                  {contact.location}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Mail size={12} />
                  <span className="truncate max-w-[140px]">{contact.email}</span>
                </span>
              )}
              {contact.phone && (
                <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Phone size={12} />
                  {contact.phone}
                </span>
              )}
              {contact.attachment_count && contact.attachment_count > 0 && (
                <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Paperclip size={12} />
                  {contact.attachment_count}
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight 
            className="text-slate-700 group-hover:text-slate-500 transition-colors flex-shrink-0 mt-1" 
            size={18} 
          />
        </div>
      </div>
    </Link>
  )
}
