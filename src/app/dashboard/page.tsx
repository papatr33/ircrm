'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { exportAllData } from '@/lib/export'
import { Contact } from '@/types'
import Navbar from '@/components/Navbar'
import ContactCard from '@/components/ContactCard'
import { Plus, Search, MapPin, X, Users, AlertCircle, Download, Loader2, CheckCircle, Upload, TrendingUp, Calendar, Star, Building2, ChevronRight, ArrowLeft } from 'lucide-react'
import ExcelImport from '@/components/ExcelImport'

type ContactWithCount = Contact & { attachment_count?: number }

type ViewMode = 'contacts' | 'locations' | 'institutions'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [contacts, setContacts] = useState<ContactWithCount[]>([])
  const [filteredContacts, setFilteredContacts] = useState<ContactWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [dateFilterType, setDateFilterType] = useState<'before' | 'after'>('before')
  
  // View mode for drill-down
  const [viewMode, setViewMode] = useState<ViewMode>('contacts')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null)
  
  // Derived data
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

  // Get unique institutions with counts
  const institutionsWithCounts = useMemo(() => {
    const counts = new Map<string, number>()
    contacts.forEach(c => {
      if (c.institution) {
        counts.set(c.institution, (counts.get(c.institution) || 0) + 1)
      }
    })
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [contacts])

  // Get locations with counts
  const locationsWithCounts = useMemo(() => {
    const counts = new Map<string, number>()
    contacts.forEach(c => {
      if (c.location) {
        counts.set(c.location, (counts.get(c.location) || 0) + 1)
      }
    })
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [contacts])

  // Filter contacts based on all criteria
  useEffect(() => {
    let filtered = contacts

    // Search filter
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

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter(contact => contact.location === locationFilter)
    }

    // Selected location from drill-down
    if (selectedLocation) {
      filtered = filtered.filter(contact => contact.location === selectedLocation)
    }

    // Selected institution from drill-down
    if (selectedInstitution) {
      filtered = filtered.filter(contact => contact.institution === selectedInstitution)
    }

    // Priority filter
    if (priorityFilter) {
      if (priorityFilter === 'high') {
        filtered = filtered.filter(contact => contact.priority && contact.priority <= 2)
      } else if (priorityFilter === 'medium') {
        filtered = filtered.filter(contact => contact.priority === 3)
      } else if (priorityFilter === 'low') {
        filtered = filtered.filter(contact => contact.priority && contact.priority >= 4)
      } else {
        const priorityNum = parseInt(priorityFilter)
        if (!isNaN(priorityNum)) {
          filtered = filtered.filter(contact => contact.priority === priorityNum)
        }
      }
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(contact => {
        if (!contact.last_interaction_date) return false
        const contactDate = new Date(contact.last_interaction_date)
        return dateFilterType === 'before' 
          ? contactDate < filterDate 
          : contactDate > filterDate
      })
    }

    setFilteredContacts(filtered)
  }, [searchQuery, locationFilter, priorityFilter, dateFilter, dateFilterType, selectedLocation, selectedInstitution, contacts])

  const clearFilters = () => {
    setSearchQuery('')
    setLocationFilter('')
    setPriorityFilter('')
    setDateFilter('')
    setDateFilterType('before')
    setSelectedLocation(null)
    setSelectedInstitution(null)
    setViewMode('contacts')
  }

  const hasActiveFilters = searchQuery || locationFilter || priorityFilter || dateFilter || selectedLocation || selectedInstitution

  // Stats card click handlers
  const handleTotalContactsClick = () => {
    clearFilters()
    setViewMode('contacts')
  }

  const handleHighPriorityClick = () => {
    clearFilters()
    setPriorityFilter('high')
    setViewMode('contacts')
  }

  const handleInstitutionsClick = () => {
    clearFilters()
    setViewMode('institutions')
  }

  const handleLocationsClick = () => {
    clearFilters()
    setViewMode('locations')
  }

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location)
    setViewMode('contacts')
  }

  const handleInstitutionSelect = (institution: string) => {
    setSelectedInstitution(institution)
    setViewMode('contacts')
  }

  const handleBackToList = () => {
    if (selectedLocation) {
      setSelectedLocation(null)
      setViewMode('locations')
    } else if (selectedInstitution) {
      setSelectedInstitution(null)
      setViewMode('institutions')
    } else {
      setViewMode('contacts')
    }
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
  const uniqueInstitutions = institutionsWithCounts.length

  // Get current view title
  const getViewTitle = () => {
    if (selectedLocation) return `Contacts in ${selectedLocation}`
    if (selectedInstitution) return `Contacts at ${selectedInstitution}`
    if (viewMode === 'locations') return 'All Locations'
    if (viewMode === 'institutions') return 'All Institutions'
    if (priorityFilter === 'high') return 'High Priority Contacts'
    return 'Investor Contacts'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            {(viewMode !== 'contacts' || selectedLocation || selectedInstitution || priorityFilter) && (
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-2 transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {getViewTitle()}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {viewMode === 'locations' 
                ? `${locationsWithCounts.length} locations`
                : viewMode === 'institutions'
                  ? `${institutionsWithCounts.length} institutions`
                  : `${filteredContacts.length} contacts`
              }
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

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={handleTotalContactsClick}
            className={`stats-card text-left transition-all ${viewMode === 'contacts' && !hasActiveFilters ? 'ring-2 ring-indigo-500 ring-offset-2' : 'hover:shadow-lg'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{contacts.length}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users className="text-indigo-500" size={20} />
              </div>
            </div>
          </button>
          <button
            onClick={handleHighPriorityClick}
            className={`stats-card text-left transition-all ${priorityFilter === 'high' ? 'ring-2 ring-red-500 ring-offset-2' : 'hover:shadow-lg'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">High Priority</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{highPriorityCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-red-500" size={20} />
              </div>
            </div>
          </button>
          <button
            onClick={handleInstitutionsClick}
            className={`stats-card text-left transition-all ${viewMode === 'institutions' ? 'ring-2 ring-violet-500 ring-offset-2' : 'hover:shadow-lg'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Institutions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueInstitutions}</p>
              </div>
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <Building2 className="text-violet-500" size={20} />
              </div>
            </div>
          </button>
          <button
            onClick={handleLocationsClick}
            className={`stats-card text-left transition-all ${viewMode === 'locations' ? 'ring-2 ring-emerald-500 ring-offset-2' : 'hover:shadow-lg'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Locations</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{locations.length}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <MapPin className="text-emerald-500" size={20} />
              </div>
            </div>
          </button>
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

        {/* Locations List View */}
        {viewMode === 'locations' && (
          <div className="space-y-2 animate-stagger">
            {locationsWithCounts.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => handleLocationSelect(name)}
                className="w-full p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-lg transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <MapPin className="text-emerald-500" size={18} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{name}</p>
                    <p className="text-gray-500 text-sm">{count} contact{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-emerald-500 transition-colors" size={20} />
              </button>
            ))}
          </div>
        )}

        {/* Institutions List View */}
        {viewMode === 'institutions' && (
          <div className="space-y-2 animate-stagger">
            {institutionsWithCounts.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => handleInstitutionSelect(name)}
                className="w-full p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-lg transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                    <Building2 className="text-violet-500" size={18} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{name}</p>
                    <p className="text-gray-500 text-sm">{count} contact{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-violet-500 transition-colors" size={20} />
              </button>
            ))}
          </div>
        )}

        {/* Contacts View */}
        {viewMode === 'contacts' && (
          <>
            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
              <div className="flex flex-col gap-3">
                {/* Row 1: Search */}
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
                </div>

                {/* Row 2: Filters */}
                <div className="flex flex-wrap gap-3">
                  {/* Location filter */}
                  {locations.length > 0 && (
                    <div className="relative min-w-[180px]">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                      >
                        <option value="">All locations</option>
                        {locations.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Priority filter */}
                  <div className="relative min-w-[160px]">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">All priorities</option>
                      <option value="high">High (1-2)</option>
                      <option value="medium">Medium (3)</option>
                      <option value="low">Low (4-5)</option>
                      <option value="1">1 - Highest</option>
                      <option value="2">2 - High</option>
                      <option value="3">3 - Medium</option>
                      <option value="4">4 - Low</option>
                      <option value="5">5 - Lowest</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Date filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative min-w-[120px]">
                      <select
                        value={dateFilterType}
                        onChange={(e) => setDateFilterType(e.target.value as 'before' | 'after')}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                      >
                        <option value="before">Before</option>
                        <option value="after">After</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="relative min-w-[160px]">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                        placeholder="Select date"
                      />
                    </div>
                  </div>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium"
                    >
                      <X size={16} />
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active filters badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-gray-500 text-sm">Active filters:</span>
                {selectedLocation && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                    <MapPin size={14} />
                    {selectedLocation}
                    <button onClick={() => setSelectedLocation(null)} className="hover:text-emerald-900">
                      <X size={14} />
                    </button>
                  </span>
                )}
                {selectedInstitution && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-sm font-medium">
                    <Building2 size={14} />
                    {selectedInstitution}
                    <button onClick={() => setSelectedInstitution(null)} className="hover:text-violet-900">
                      <X size={14} />
                    </button>
                  </span>
                )}
                {priorityFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                    <Star size={14} />
                    Priority: {priorityFilter}
                    <button onClick={() => setPriorityFilter('')} className="hover:text-red-900">
                      <X size={14} />
                    </button>
                  </span>
                )}
                {dateFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    <Calendar size={14} />
                    {dateFilterType === 'before' ? 'Before' : 'After'} {new Date(dateFilter).toLocaleDateString()}
                    <button onClick={() => setDateFilter('')} className="hover:text-blue-900">
                      <X size={14} />
                    </button>
                  </span>
                )}
                {locationFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                    <MapPin size={14} />
                    {locationFilter}
                    <button onClick={() => setLocationFilter('')} className="hover:text-emerald-900">
                      <X size={14} />
                    </button>
                  </span>
                )}
                <span className="text-gray-400 text-sm ml-2">
                  {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''}
                </span>
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
          </>
        )}
      </main>
    </div>
  )
}
