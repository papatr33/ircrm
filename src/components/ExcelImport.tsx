'use client'

import { useState, useRef } from 'react'
import { parseExcelFile, parseAllSheets, getExcelSheets, mapToContacts, importContacts, SheetInfo } from '@/lib/import'
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle, AlertCircle, Info, Layers } from 'lucide-react'

interface ExcelImportProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

type ImportStep = 'upload' | 'select-sheets' | 'preview' | 'importing' | 'complete'

interface PreviewContact {
  name: string
  email: string | null
  phone: string | null
  location: string | null
  institution: string | null
  last_interaction_date: string | null
  priority: number | null
  details: string | null
}

export default function ExcelImport({ isOpen, onClose, onImportComplete }: ExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<PreviewContact[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ message: '', percent: 0 })
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetState = () => {
    setStep('upload')
    setFile(null)
    setSheets([])
    setSelectedSheets([])
    setPreviewData([])
    setImporting(false)
    setProgress({ message: '', percent: 0 })
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    if (!importing) {
      resetState()
      onClose()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    const isExcel = selectedFile.name.endsWith('.xlsx') || 
                    selectedFile.name.endsWith('.xls') || 
                    selectedFile.name.endsWith('.csv') ||
                    validTypes.includes(selectedFile.type)

    if (!isExcel) {
      setError('Please upload an Excel file (.xlsx, .xls) or CSV file')
      return
    }

    setError(null)
    setFile(selectedFile)

    try {
      // Get list of sheets
      const sheetList = await getExcelSheets(selectedFile)
      
      if (sheetList.length === 0) {
        setError('No data sheets found in the file')
        return
      }
      
      // If only one sheet, go directly to preview
      if (sheetList.length === 1) {
        const rawData = await parseExcelFile(selectedFile, sheetList[0].name)
        const contacts = mapToContacts(rawData)
        setPreviewData(contacts)
        setStep('preview')
      } else {
        // Multiple sheets - let user select
        setSheets(sheetList)
        setSelectedSheets(sheetList.map(s => s.name)) // Select all by default
        setStep('select-sheets')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    }
  }

  const handleSheetToggle = (sheetName: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetName)
        ? prev.filter(s => s !== sheetName)
        : [...prev, sheetName]
    )
  }

  const handleSheetsConfirm = async () => {
    if (!file || selectedSheets.length === 0) return
    
    setError(null)
    
    try {
      // Parse all selected sheets
      const allSheetsData = await parseAllSheets(file)
      const filteredData = allSheetsData.filter(s => selectedSheets.includes(s.sheetName))
      
      // Map and combine all contacts
      const allContacts: PreviewContact[] = []
      for (const { sheetName, data } of filteredData) {
        const contacts = mapToContacts(data, sheetName)
        allContacts.push(...contacts)
      }
      
      setPreviewData(allContacts)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse sheets')
    }
  }

  const handleImport = async () => {
    if (previewData.length === 0) return

    setStep('importing')
    setImporting(true)
    setError(null)

    try {
      const importResult = await importContacts(previewData, (message, percent) => {
        setProgress({ message, percent })
      })

      setResult({
        imported: importResult.imported,
        skipped: importResult.skipped,
        errors: importResult.errors,
      })
      setStep('complete')
      onImportComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  const validContacts = previewData.filter(c => c.name.trim())
  const invalidContacts = previewData.length - validContacts.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="text-slate-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-100">Import from Excel</h2>
              <p className="text-slate-500 text-sm">
                {step === 'upload' && 'Upload your Excel file'}
                {step === 'select-sheets' && 'Select which sheets to import'}
                {step === 'preview' && `${validContacts.length} contacts ready to import`}
                {step === 'importing' && 'Importing contacts...'}
                {step === 'complete' && 'Import complete'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 mb-4">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
                <Upload className="mx-auto text-slate-600 mb-4" size={40} />
                <p className="text-slate-300 font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-slate-500 text-sm">
                  Excel files (.xlsx, .xls) or CSV
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Column mapping info */}
              <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="text-slate-500 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-sm">
                    <p className="text-slate-400 font-medium mb-2">Supported columns:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500">
                      <span>• Name (required)</span>
                      <span>• Institution / Company</span>
                      <span>• Email</span>
                      <span>• Priority (1-5)</span>
                      <span>• Phone</span>
                      <span>• Date of last interaction</span>
                      <span>• Location</span>
                      <span>• Notes / Details</span>
                    </div>
                    <p className="text-slate-500 mt-2">Extra columns will be added to notes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sheet Selection Step */}
          {step === 'select-sheets' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="text-slate-500" size={18} />
                <p className="text-slate-300">Select sheets to import:</p>
              </div>
              <div className="space-y-2 max-h-60 overflow-auto">
                {sheets.map(sheet => (
                  <label
                    key={sheet.name}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedSheets.includes(sheet.name)
                        ? 'border-slate-600 bg-slate-800/50'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSheets.includes(sheet.name)}
                        onChange={() => handleSheetToggle(sheet.name)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-slate-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-slate-200 font-medium">{sheet.name}</span>
                    </div>
                    <span className="text-slate-500 text-sm">{sheet.rowCount} rows</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div>
              {invalidContacts > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 mb-4">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {invalidContacts} row{invalidContacts > 1 ? 's' : ''} will be skipped (missing name)
                  </p>
                </div>
              )}

              <div className="max-h-80 overflow-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Institution</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Email</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {validContacts.slice(0, 10).map((contact, index) => (
                      <tr key={index} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-200">{contact.name}</td>
                        <td className="px-4 py-3 text-slate-400">{contact.institution || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{contact.email || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{contact.priority || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validContacts.length > 10 && (
                  <div className="px-4 py-3 text-center text-slate-500 text-sm bg-slate-800/30">
                    ... and {validContacts.length - 10} more contacts
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="py-8">
              <div className="flex items-center justify-center mb-6">
                <Loader2 className="animate-spin text-slate-400" size={40} />
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">{progress.message}</span>
                  <span className="text-slate-500">{progress.percent}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-slate-600 to-slate-500 transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && result && (
            <div className="py-4">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-green-400" size={32} />
                </div>
              </div>
              <div className="text-center mb-6">
                <p className="text-xl font-medium text-slate-100 mb-2">
                  {result.imported} contacts imported
                </p>
                {result.skipped > 0 && (
                  <p className="text-slate-500 text-sm">
                    {result.skipped} skipped
                  </p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm font-medium mb-2">Some errors occurred:</p>
                  <ul className="text-red-400/80 text-sm list-disc list-inside">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          {step === 'upload' && (
            <button onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
          )}

          {step === 'select-sheets' && (
            <>
              <button onClick={resetState} className="btn-secondary">
                Back
              </button>
              <button
                onClick={handleSheetsConfirm}
                disabled={selectedSheets.length === 0}
                className="btn-primary"
              >
                Continue with {selectedSheets.length} sheet{selectedSheets.length !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => sheets.length > 1 ? setStep('select-sheets') : resetState()} className="btn-secondary">
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={validContacts.length === 0}
                className="btn-primary"
              >
                Import {validContacts.length} Contacts
              </button>
            </>
          )}

          {step === 'complete' && (
            <button onClick={handleClose} className="btn-primary">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
