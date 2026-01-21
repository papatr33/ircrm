'use client'

import { useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Attachment } from '@/types'
import { Upload, File, Trash2, Download, Loader2, AlertCircle, FileText, Image, FileSpreadsheet, Mail, LucideIcon, Calendar, Filter, X } from 'lucide-react'

interface FileUploadProps {
  contactId: string
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
}

const FILE_ICONS: Record<string, LucideIcon> = {
  'application/pdf': FileText,
  'image/': Image,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'application/vnd.ms-excel': FileSpreadsheet,
  'text/csv': FileSpreadsheet,
  'message/rfc822': Mail,
  'application/vnd.ms-outlook': Mail,
}

// File type categories for filtering
const FILE_CATEGORIES: Record<string, { label: string; types: string[]; icon: LucideIcon }> = {
  'pdf': { 
    label: 'PDF', 
    types: ['application/pdf'],
    icon: FileText
  },
  'excel': { 
    label: 'Excel/CSV', 
    types: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
    icon: FileSpreadsheet
  },
  'image': { 
    label: 'Images', 
    types: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    icon: Image
  },
  'email': { 
    label: 'Email', 
    types: ['message/rfc822', 'application/vnd.ms-outlook'],
    icon: Mail
  },
  'other': { 
    label: 'Other', 
    types: [],
    icon: File
  },
}

function getFileCategory(fileType: string | null): string {
  if (!fileType) return 'other'
  
  for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
    if (category === 'other') continue
    if (config.types.some(t => fileType.startsWith(t) || fileType === t)) {
      return category
    }
    // Check for image types that start with 'image/'
    if (category === 'image' && fileType.startsWith('image/')) {
      return 'image'
    }
  }
  return 'other'
}

function getFileIcon(fileType: string | null): LucideIcon {
  if (!fileType) return File
  
  for (const [key, Icon] of Object.entries(FILE_ICONS)) {
    if (fileType.startsWith(key) || fileType === key) {
      return Icon
    }
  }
  return File
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FileUpload({ contactId, attachments, onAttachmentsChange }: FileUploadProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Get unique file categories from attachments
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    attachments.forEach(a => {
      categories.add(getFileCategory(a.file_type))
    })
    return Array.from(categories).sort()
  }, [attachments])
  
  // Get unique dates from attachments
  const availableDates = useMemo(() => {
    const dates = new Map<string, string>()
    attachments.forEach(a => {
      const date = new Date(a.created_at)
      const key = date.toISOString().split('T')[0]
      const label = formatDate(a.created_at)
      dates.set(key, label)
    })
    return Array.from(dates.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [attachments])
  
  // Filtered attachments
  const filteredAttachments = useMemo(() => {
    let filtered = attachments
    
    if (typeFilter) {
      filtered = filtered.filter(a => getFileCategory(a.file_type) === typeFilter)
    }
    
    if (dateFilter) {
      filtered = filtered.filter(a => {
        const date = new Date(a.created_at).toISOString().split('T')[0]
        return date === dateFilter
      })
    }
    
    return filtered
  }, [attachments, typeFilter, dateFilter])
  
  const hasActiveFilters = typeFilter || dateFilter
  
  const clearFilters = () => {
    setTypeFilter('')
    setDateFilter('')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newAttachments: Attachment[] = []

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${contactId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: attachment, error: dbError } = await supabase
          .from('attachments')
          .insert({
            contact_id: contactId,
            user_id: user.id,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single()

        if (dbError) throw dbError

        newAttachments.push(attachment)
      }

      onAttachmentsChange([...attachments, ...newAttachments])
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError(err instanceof Error ? err.message : 'Failed to upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete "${attachment.file_name}"?`)) return

    setDeletingId(attachment.id)

    try {
      await supabase.storage
        .from('attachments')
        .remove([attachment.file_path])

      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id)

      if (error) throw error

      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.file_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download file')
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div 
        className="border border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-slate-600 transition-colors cursor-pointer bg-slate-800/20"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.eml,.msg,.png,.jpg,.jpeg,.gif"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="animate-spin text-slate-400" size={24} />
            <p className="text-slate-500 text-sm">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="text-slate-600" size={24} />
            <p className="text-slate-400 text-sm font-medium">
              Click to upload
            </p>
            <p className="text-slate-600 text-xs">
              PDF, Word, Excel, images, emails
            </p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} />
          {uploadError}
        </div>
      )}

      {/* Filters - only show if there are attachments */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-xs font-medium transition-colors ${
              hasActiveFilters ? 'text-slate-200' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Filter size={14} />
            {hasActiveFilters ? 'Filters active' : 'Filter files'}
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                {filteredAttachments.length}/{attachments.length}
              </span>
            )}
          </button>
          
          {/* Filter controls */}
          {showFilters && (
            <div className="p-3 bg-slate-800/40 rounded-lg space-y-3 animate-fade-in">
              {/* File type filter */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <File size={12} />
                  File Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">All types</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>
                      {FILE_CATEGORIES[category]?.label || category}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Date filter */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={12} />
                  Date Uploaded
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">All dates</option>
                  {availableDates.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={12} />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {filteredAttachments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No files match your filters
            </p>
          ) : (
            filteredAttachments.map(attachment => {
              const FileIcon = getFileIcon(attachment.file_type)
              const isDeleting = deletingId === attachment.id

              return (
                <div 
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg group"
                >
                  <div className="w-9 h-9 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileIcon className="text-slate-400" size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm font-medium truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-slate-600 text-xs">
                      {formatFileSize(attachment.file_size)}
                      {attachment.file_size && ' · '}
                      {formatDate(attachment.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(attachment)}
                      disabled={isDeleting}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
