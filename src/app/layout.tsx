import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IR CRM - Investor Relations',
  description: 'Manage your investor relationships',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Subtle background */}
        <div className="fixed inset-0 -z-10 bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-slate-800/20 rounded-full blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  )
}
