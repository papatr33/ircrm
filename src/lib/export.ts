'use client'

import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Contact, Attachment } from '@/types'
import { createClient } from './supabase'

interface ContactWithAttachments extends Contact {
  attachments: Attachment[]
}

// Sanitize folder/file names to remove invalid characters
function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim()
}

// Format date for Excel
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format interaction date for Excel
function formatInteractionDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Generate Excel file with contacts data
function generateExcel(contacts: ContactWithAttachments[]): Blob {
  // Prepare data for Excel
  const excelData = contacts.map((contact, index) => ({
    '#': index + 1,
    'Name': contact.name,
    'Institution': contact.institution || '',
    'Email': contact.email || '',
    'Phone': contact.phone || '',
    'Location': contact.location || '',
    'Priority': contact.priority || '',
    'Last Interaction': formatInteractionDate(contact.last_interaction_date),
    'Notes': contact.details || '',
    'Files Count': contact.attachments.length,
    'File Names': contact.attachments.map(a => a.file_name).join(', '),
    'Created': formatDate(contact.created_at),
    'Updated': formatDate(contact.updated_at),
  }))

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 25 },  // Name
    { wch: 25 },  // Institution
    { wch: 30 },  // Email
    { wch: 18 },  // Phone
    { wch: 20 },  // Location
    { wch: 10 },  // Priority
    { wch: 18 },  // Last Interaction
    { wch: 50 },  // Notes
    { wch: 12 },  // Files Count
    { wch: 40 },  // File Names
    { wch: 20 },  // Created
    { wch: 20 },  // Updated
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts')

  // Generate Excel file as array buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Export all data function
export async function exportAllData(
  onProgress?: (message: string, percent: number) => void
): Promise<void> {
  const supabase = createClient()
  const zip = new JSZip()

  try {
    // Step 1: Fetch all contacts
    onProgress?.('Fetching contacts...', 5)
    
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true })

    if (contactsError) throw new Error(`Failed to fetch contacts: ${contactsError.message}`)
    if (!contacts || contacts.length === 0) {
      throw new Error('No contacts to export')
    }

    // Step 2: Fetch all attachments
    onProgress?.('Fetching attachments info...', 15)
    
    const { data: attachments, error: attachmentsError } = await supabase
      .from('attachments')
      .select('*')
      .order('created_at', { ascending: false })

    if (attachmentsError) throw new Error(`Failed to fetch attachments: ${attachmentsError.message}`)

    // Group attachments by contact
    const attachmentsByContact = new Map<string, Attachment[]>()
    ;(attachments || []).forEach(attachment => {
      const existing = attachmentsByContact.get(attachment.contact_id) || []
      existing.push(attachment)
      attachmentsByContact.set(attachment.contact_id, existing)
    })

    // Create contacts with attachments array
    const contactsWithAttachments: ContactWithAttachments[] = contacts.map(contact => ({
      ...contact,
      attachments: attachmentsByContact.get(contact.id) || []
    }))

    // Step 3: Generate Excel file
    onProgress?.('Generating Excel file...', 25)
    const excelBlob = generateExcel(contactsWithAttachments)
    zip.file('Contacts.xlsx', excelBlob)

    // Step 4: Create attachments folder structure and download files
    const allAttachments = attachments || []
    const totalAttachments = allAttachments.length
    
    if (totalAttachments > 0) {
      const attachmentsFolder = zip.folder('Attachments')
      
      for (let i = 0; i < contactsWithAttachments.length; i++) {
        const contact = contactsWithAttachments[i]
        
        if (contact.attachments.length > 0) {
          // Create folder for this contact
          const contactFolderName = sanitizeName(contact.name)
          const contactFolder = attachmentsFolder?.folder(contactFolderName)
          
          for (let j = 0; j < contact.attachments.length; j++) {
            const attachment = contact.attachments[j]
            const progressPercent = 30 + ((i * contact.attachments.length + j) / totalAttachments) * 60
            
            onProgress?.(
              `Downloading: ${attachment.file_name} (${contact.name})`,
              Math.round(progressPercent)
            )

            try {
              // Download file from Supabase storage
              const { data: fileData, error: downloadError } = await supabase.storage
                .from('attachments')
                .download(attachment.file_path)

              if (downloadError) {
                console.error(`Failed to download ${attachment.file_name}:`, downloadError)
                continue
              }

              // Add file to zip
              const fileName = sanitizeName(attachment.file_name)
              contactFolder?.file(fileName, fileData)
            } catch (err) {
              console.error(`Error downloading ${attachment.file_name}:`, err)
            }
          }
        }
      }
    }

    // Step 5: Generate and download zip
    onProgress?.('Creating zip file...', 95)
    
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // Generate filename with date
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0]
    const filename = `IR_CRM_Backup_${dateStr}.zip`

    onProgress?.('Download starting...', 100)
    saveAs(zipBlob, filename)

  } catch (error) {
    console.error('Export error:', error)
    throw error
  }
}
