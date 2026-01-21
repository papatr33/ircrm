'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { exportAllData } from '@/lib/export'
import { Contact } from '@/types'
import Navbar from '@/components/Navbar'
import ContactCard from '@/components/ContactCard'
import { Plus, Search, MapPin, X, Users, AlertCircle, Download, Loader2, CheckCircle, Upload, TrendingUp } from 'lucide-react'
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

  // Calculate stats
  const highPriorityCount = contacts.filter(c => c.priority && c.priority <= 2).length
  const uniqueInstitutions = new Set(contacts.map(c => c.institution).filter(Boolean)).size

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Investor Contacts
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage your investor relationships
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{contacts.length}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users className="text-indigo-500" size={20} />
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">High Priority</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{highPriorityCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-red-500" size={20} />
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Institutions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueInstitutions}</p>
              </div>
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <svg className="text-violet-500 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Locations</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{locations.length}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <MapPin className="text-emerald-500" size={20} />
              </div>
            </div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl p-6 shadow-2xl animate-fade-in">
              {exportError ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                      <AlertCircle className="text-red-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Export Failed</h3>
                      <p className="text-gray-500 text-sm">An error occurred</p>
                    </div>
                  </div>
                  <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-xl">
                    {exportError}
                  </p>
                  <button onClick={closeExportModal} className="btn-secondary w-full">
                    Close
                  </button>
                </>
              ) : exportSuccess ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-emerald-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Export Complete!</h3>
                      <p className="text-gray-500 text-sm">Your download should start automatically</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                      <Loader2 className="text-indigo-500 animate-spin" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Exporting Data</h3>
                      <p className="text-gray-500 text-sm">Please wait...</p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 truncate max-w-[80%]">
                        {exportProgress.message}
                      </span>
                      <span className="text-gray-400 font-medium">{exportProgress.percent}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                        style={{ width: `${exportProgress.percent}%` }}
                      />
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-xs text-center">
                    Downloading contacts and attachments...
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or institution..."
                className="input-field pl-12"
              />
            </div>

            {locations.length > 0 && (
              <div className="sm:w-52 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="input-field pl-12 appearance-none cursor-pointer pr-10"
                >
                  <option value="">All locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {(searchQuery || locationFilter) && (
              <button
                onClick={clearFilters}
                className="btn-ghost flex items-center gap-2 text-gray-500"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results info */}
        {(searchQuery || locationFilter) && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 text-sm">
              {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
            <AlertCircle size={18} />
            {error}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-300" size={28} />
            </div>
            {contacts.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No contacts yet
                </h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  Get started by adding your first investor contact or importing from Excel
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setIsImporting(true)} className="btn-secondary flex items-center gap-2">
                    <Upload size={18} />
                    Import Excel
                  </button>
                  <Link href="/dashboard/new" className="btn-primary inline-flex items-center gap-2">
                    <Plus size={18} />
                    Add Contact
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No matches found
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Try adjusting your search or filters
                </p>
                <button onClick={clearFilters} className="btn-secondary">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-stagger">
            {filteredContacts.map(contact => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
