import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { TopNav } from '@/components/layout/TopNav'
import { BottomNav } from '@/components/layout/BottomNav'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
}

export const metadata: Metadata = {
  title: 'Vault',
  description: 'Personal finance tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vault',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="it"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="flex flex-col bg-background overflow-hidden" style={{ height: 'calc(100dvh + env(safe-area-inset-bottom, 0px))' }}>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('vault-theme');if(!t||t==='dark')return;var r=document.documentElement;r.classList.remove('dark');r.classList.add(t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t);})()` }}
        />
        <TopNav />
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
        >
          {children}
        </main>
        <BottomNav />
        <SpeedInsights />
      </body>
    </html>
  )
}
