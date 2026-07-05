import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GaritaFlow — Tiempos de espera frontera Tijuana–San Diego',
  description: 'Consulta en tiempo real los tiempos de espera en San Ysidro y Otay Mesa. Datos de CBP actualizados cada 5 minutos.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A1B3D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans bg-surface-bg antialiased">{children}</body>
    </html>
  )
}