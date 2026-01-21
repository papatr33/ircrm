export interface Contact {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  location: string | null
  details: string | null
  institution: string | null
  last_interaction_date: string | null
  priority: number | null
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  contact_id: string
  user_id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

export interface ContactWithAttachments extends Contact {
  attachments: Attachment[]
}

export type ContactFormData = Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>
