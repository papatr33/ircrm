'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { exportAllData } from '@/lib/export'
import { Contact } from '@/types'
import Navbar from '@/components/Navbar'
import ContactCard from '@/components/ContactCard'
import { Plus, Search, MapPin, X, Users, AlertCircle, Download, Loader2, CheckCircle, Upload } from 'lucide-react'
import ExcelImport from '@/components/ExcelImport'

type ContactWithCount = Contact & { attachment_count?: number }

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [contacts, setContacts] = useState<ContactWithCount[]>([])
  const [filteredContacts, setFilteredContacts] = useState<ContactWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  
  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ message: '', percent: 0 })
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)
  
  // Import state
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      await fetchContacts()
    }

    checkAuthAndFetch()
  }, [router, supabase])

  const fetchContacts = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          attachments:attachments(count)
        `)
        .order('name', { ascending: true })

      if (contactsError) throw contactsError

      const contactsWithCount: ContactWithCount[] = (contactsData || []).map(contact => ({
        ...contact,
        attachment_count: contact.attachments?.[0]?.count || 0,
      }))

      setContacts(contactsWithCount)
      setFilteredContacts(contactsWithCount)

      const uniqueLocations = [...new Set(
        contactsWithCount
          .map(c => c.location)
          .filter((loc): loc is string => !!loc)
      )].sort()
      setLocations(uniqueLocations)

    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = contacts

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.details?.toLowerCase().includes(query) ||
        contact.phone?.includes(query) ||
        contact.institution?.toLowerCase().includes(query)
      )
    }

    if (locationFilter) {
      filtered = filtered.filter(contact => contact.location === locationFilter)
    }

    setFilteredContacts(filtered)
  }, [searchQuery, locationFilter, contacts])

  const clearFilters = () => {
    setSearchQuery('')
    setLocationFilter('')
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(false)
    setExportProgress({ message: 'Starting export...', percent: 0 })

    try {
      await exportAllData((message, percent) => {
        setExportProgress({ message, percent })
      })
      setExportSuccess(true)
      setTimeout(() => {
        setIsExporting(false)
        setExportSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Export error:', err)
      setExportError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const closeExportModal = () => {
    if (!isExporting || exportError) {
      setIsExporting(false)
      setExportError(null)
      setExportSuccess(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Contacts
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {contacts.length} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImporting(true)}
              className="btn-secondary flex items-center gap-2"
              title="Import contacts from Excel"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || contacts.length === 0}
              className="btn-secondary flex items-center gap-2"
              title="Export all contacts and files"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <Link href="/dashboard/new" className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              Add Contact
            </Link>
          </div>
        </div>

        {/* Import Modal */}
        <ExcelImport
          isOpen={isImporting}
          onClose={() => setIsImporting(false)}
          onImportComplete={fetchContacts}
        />

        {/* Export Progress Modal */}
        {isExporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-fade-in">
              {exportError ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="text-red-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-100">Export Failed</h3>
                      <p className="text-slate-500 text-sm">An error occurred</p>
                    </div>
                  </div>
                  <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">
                    {exportError}
                  </p>
                  <button onClick={closeExportModal} className="btn-secondary w-full">
                    Close
                  </button>
                </>
              ) : exportSuccess ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-green-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-100">Export Complete!</h3>
                      <p className="text-slate-500 text-sm">Your download should start automatically</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                      <Loader2 className="text-slate-400 animate-spin" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-100">Exporting Data</h3>
                      <p className="text-slate-500 text-sm">Please wait...</p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-400 truncate max-w-[80%]">
                        {exportProgress.message}
                      </span>
                      <span className="text-slate-500">{exportProgress.percent}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-slate-600 to-slate-500 transition-all duration-300"
                        style={{ width: `${exportProgress.percent}%` }}
                      />
                    </div>
                  </div>
                  
                  <p className="text-slate-600 text-xs text-center">
                    Downloading contacts and attachments...
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="input-field pl-12"
            />
          </div>

          {locations.length > 0 && (
            <div className="sm:w-48 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="input-field pl-12 appearance-none cursor-pointer"
              >
                <option value="">All locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          )}

          {(searchQuery || locationFilter) && (
            <button
              onClick={clearFilters}
              className="btn-ghost flex items-center gap-2"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        {/* Results info */}
        {(searchQuery || locationFilter) && (
          <p className="text-slate-600 text-sm mb-4">
            {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle size={18} />
            {error}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-slate-600" size={24} />
            </div>
            {contacts.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  No contacts yet
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  Add your first contact to get started
                </p>
                <Link href="/dashboard/new" className="btn-primary inline-flex items-center gap-2">
                  <Plus size={18} />
                  Add Contact
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  No matches
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  Try different search terms
                </p>
                <button onClick={clearFilters} className="btn-secondary">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 animate-stagger">
            {filteredContacts.map(contact => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
