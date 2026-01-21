# IR CRM - Investor Relations Management

A secure, invite-only web application for managing investor relationships with file attachments.

## Features

- 🔒 **Invite-only Access** - No public signup; only authorized users can access
- 👥 **Contact Management** - Add, edit, delete investor contacts
- 📎 **File Attachments** - Upload PDFs, Word docs, emails, images per contact
- 🔍 **Search & Filter** - Find contacts by name, email, or filter by location
- 🛡️ **Row Level Security** - Your data is only visible to you
- ✨ **Modern UI** - Clean, minimal design

---

## Setup Guide

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **"New Project"** and create your project
3. Go to **SQL Editor** → paste contents of `supabase/schema.sql` → click **Run**
4. Go to **Settings** → **API** → copy your **Project URL** and **anon key**

### 2. Configure Environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Add Authorized Users

Since signup is disabled, you need to manually create users:

**Option A: Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create New User"**
3. Enter email and password
4. The user can now log in to your app

**Option B: Using SQL**

```sql
-- In SQL Editor, run:
SELECT * FROM auth.users; -- View existing users
```

### 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

After deployment, update Supabase:
- **Authentication** → **URL Configuration** → Set **Site URL** to your Vercel URL

---

## Managing Users

### Add a New User

1. Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create New User"**
3. Enter email and password

### Remove a User

1. Supabase Dashboard → **Authentication** → **Users**
2. Find the user → Click **"..."** → **"Delete User"**

### Reset Password

1. Supabase Dashboard → **Authentication** → **Users**
2. Find the user → Click **"..."** → **"Send Password Recovery"**

---

## Security

| Layer | Protection |
|-------|------------|
| **Invite-only** | No public signup - you control who has access |
| **HTTPS** | All traffic encrypted (automatic on Vercel) |
| **Authentication** | Email + password required |
| **Row Level Security** | Database policies ensure users only see their own data |
| **Storage Security** | Files are private and only accessible by owner |

---

## Tech Stack

- **Framework**: Next.js 15
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS
- **Font**: Outfit

---

## License

MIT
