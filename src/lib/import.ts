'use client'

import * as XLSX from 'xlsx'
import { createClient } from './supabase'

interface ImportedContact {
  name: string
  email: string | null
  phone: string | null
  location: string | null
  details: string | null
  institution: string | null
  last_interaction_date: string | null
  priority: number | null
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

export interface SheetInfo {
  name: string
  rowCount: number
}

// Parse Excel date to YYYY-MM-DD format
function parseExcelDate(value: unknown): string | null {
  if (!value) return null
  
  // If it's a number (Excel date serial number)
  if (typeof value === 'number') {
    // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
    // Use XLSX's built-in parser
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const year = date.y
      const month = String(date.m).padStart(2, '0')
      const day = String(date.d).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
  
  // If it's a string that looks like a number (Excel serial converted to string)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    
    // Check if it's a pure number (Excel serial date)
    const numValue = parseFloat(trimmed)
    if (!isNaN(numValue) && numValue > 40000 && numValue < 60000) {
      // Likely an Excel serial date (covers years ~2009-2064)
      const date = XLSX.SSF.parse_date_code(numValue)
      if (date) {
        const year = date.y
        const month = String(date.m).padStart(2, '0')
        const day = String(date.d).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    }
    
    // Try parsing various date formats
    const parsedDate = new Date(trimmed)
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear()
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
      const day = String(parsedDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
  
  // If it's already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return null
}

// Parse priority value
function parsePriority(value: unknown): number | null {
  if (!value) return null
  if (value === 'N/A' || value === 'n/a' || value === '-') return null
  
  const num = typeof value === 'number' ? value : parseInt(String(value).trim())
  if (isNaN(num) || num < 1 || num > 5) return null
  
  return num
}

// Normalize column names (case-insensitive, trim spaces)
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[_\s]+/g, '')
}

// Map of possible column names to our field names
const columnMappings: Record<string, keyof ImportedContact> = {
  'name': 'name',
  'fullname': 'name',
  'contactname': 'name',
  'email': 'email',
  'emailaddress': 'email',
  'mail': 'email',
  'phone': 'phone',
  'phonenumber': 'phone',
  'telephone': 'phone',
  'tel': 'phone',
  'mobile': 'phone',
  'location': 'location',
  'city': 'location',
  'address': 'location',
  'country': 'location',
  'notes': 'details',
  'details': 'details',
  'note': 'details',
  'description': 'details',
  'comments': 'details',
  'institution': 'institution',
  'company': 'institution',
  'organization': 'institution',
  'org': 'institution',
  'firm': 'institution',
  'fund': 'institution',
  // Date columns - only columns that are actual dates
  'dateoflastinteraction': 'last_interaction_date',
  'date': 'last_interaction_date',
  'lastinteractiondate': 'last_interaction_date',
  'lastcontactdate': 'last_interaction_date',
  'interactiondate': 'last_interaction_date',
  // Priority columns - including the typo "priorty"
  'priority': 'priority',
  'priorty': 'priority',  // Common typo
  'rank': 'priority',
  'importance': 'priority',
}

// Extra columns that should be appended to notes/details
const extraNotesColumns = [
  'lastinteraction',      // "Last interaction" text description
  'documentsprovided',    // "documents provided"
  'documents',
]

// Get list of sheets from Excel file
export function getExcelSheets(file: File): Promise<SheetInfo[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        
        const sheets: SheetInfo[] = workbook.SheetNames
          .filter(name => name.toLowerCase() !== 'definitions') // Skip definitions sheet
          .map(name => {
            const sheet = workbook.Sheets[name]
            const jsonData = XLSX.utils.sheet_to_json(sheet)
            return { name, rowCount: jsonData.length }
          })
          .filter(sheet => sheet.rowCount > 0) // Only sheets with data
        
        resolve(sheets)
      } catch (error) {
        reject(new Error('Failed to parse Excel file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Parse uploaded Excel file with sheet selection
export function parseExcelFile(file: File, sheetName?: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        
        // If sheetName provided, use that; otherwise find first data sheet
        let targetSheet = sheetName
        if (!targetSheet) {
          // Skip "Definitions" sheet and find first data sheet
          targetSheet = workbook.SheetNames.find(
            name => name.toLowerCase() !== 'definitions'
          ) || workbook.SheetNames[0]
        }
        
        const sheet = workbook.Sheets[targetSheet]
        
        // Convert to JSON - use raw:true to get actual values including numbers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
          raw: true,
          defval: null 
        })
        
        resolve(jsonData)
      } catch (error) {
        reject(new Error('Failed to parse Excel file'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// Parse all sheets at once
export function parseAllSheets(file: File): Promise<{ sheetName: string; data: Record<string, unknown>[] }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        
        const allData = workbook.SheetNames
          .filter(name => name.toLowerCase() !== 'definitions')
          .map(sheetName => {
            const sheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
              raw: true,
              defval: null 
            })
            return { sheetName, data: jsonData }
          })
          .filter(sheet => sheet.data.length > 0)
        
        resolve(allData)
      } catch (error) {
        reject(new Error('Failed to parse Excel file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Map raw data to our contact format
export function mapToContacts(rawData: Record<string, unknown>[], sourceSheet?: string): ImportedContact[] {
  return rawData.map((row) => {
    const contact: ImportedContact = {
      name: '',
      email: null,
      phone: null,
      location: null,
      details: null,
      institution: null,
      last_interaction_date: null,
      priority: null,
    }
    
    // Collect extra notes from unmapped columns
    const extraNotes: string[] = []
    
    // Map columns based on header names
    for (const [key, value] of Object.entries(row)) {
      if (!value) continue
      
      const normalizedKey = normalizeColumnName(key)
      const fieldName = columnMappings[normalizedKey]
      
      if (fieldName) {
        if (fieldName === 'name') {
          contact.name = String(value || '').trim()
        } else if (fieldName === 'last_interaction_date') {
          contact.last_interaction_date = parseExcelDate(value)
        } else if (fieldName === 'priority') {
          contact.priority = parsePriority(value)
        } else if (fieldName === 'details') {
          // Append to details instead of replacing
          const textValue = String(value).trim()
          if (textValue) {
            extraNotes.push(textValue)
          }
        } else {
          const stringValue = value ? String(value).trim() : null
          contact[fieldName] = stringValue || null
        }
      } else if (extraNotesColumns.includes(normalizedKey)) {
        // Add extra info to notes
        const textValue = String(value).trim()
        if (textValue) {
          const label = key.trim()
          extraNotes.push(`${label}: ${textValue}`)
        }
      }
    }
    
    // Add source sheet to notes if provided
    if (sourceSheet) {
      extraNotes.unshift(`[${sourceSheet}]`)
    }
    
    // Combine all notes
    if (extraNotes.length > 0) {
      contact.details = extraNotes.join('\n')
    }
    
    return contact
  })
}

// Import contacts to Supabase
export async function importContacts(
  contacts: ImportedContact[],
  onProgress?: (message: string, percent: number) => void
): Promise<ImportResult> {
  const supabase = createClient()
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ...result, success: false, errors: ['Not authenticated'] }
  }
  
  const validContacts = contacts.filter(c => c.name.trim())
  const totalContacts = validContacts.length
  
  if (totalContacts === 0) {
    return { ...result, success: false, errors: ['No valid contacts found (name is required)'] }
  }
  
  // Insert contacts in batches
  const batchSize = 50
  for (let i = 0; i < validContacts.length; i += batchSize) {
    const batch = validContacts.slice(i, i + batchSize)
    const percent = Math.round(((i + batch.length) / totalContacts) * 100)
    
    onProgress?.(`Importing contacts ${i + 1} - ${Math.min(i + batchSize, totalContacts)} of ${totalContacts}...`, percent)
    
    const contactsToInsert = batch.map(contact => ({
      user_id: user.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      location: contact.location,
      details: contact.details,
      institution: contact.institution,
      last_interaction_date: contact.last_interaction_date,
      priority: contact.priority,
    }))
    
    const { error } = await supabase.from('contacts').insert(contactsToInsert)
    
    if (error) {
      result.errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`)
      result.skipped += batch.length
    } else {
      result.imported += batch.length
    }
  }
  
  // Count skipped (rows without name)
  result.skipped += contacts.length - validContacts.length
  
  if (result.errors.length > 0) {
    result.success = false
  }
  
  return result
}
