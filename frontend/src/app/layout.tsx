import type { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}
