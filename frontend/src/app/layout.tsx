import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { WalletProvider } from '@/contexts/WalletContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bunty - Privacy-First Financial Identity',
  description: 'Prove income, KYC status, and creditworthiness without revealing sensitive documents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WalletProvider>{children}</WalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
