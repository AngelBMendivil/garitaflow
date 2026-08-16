import Link from 'next/link'
import { LEGAL } from '@/lib/legal'

/** Marco común de las páginas legales: encabezado, ancho de lectura y pie. */
export default function LegalLayout({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-surface-bg">
      <header className="border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-bold text-brand-navy">
            GaritaFlow
          </Link>
          <Link href="/" className="text-sm font-medium text-brand-blue hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy">{titulo}</h1>
        <p className="mt-2 text-sm text-surface-muted">
          Última actualización: {LEGAL.VIGENCIA}
        </p>
        <div className="legal-body mt-8">{children}</div>
      </article>

      <footer className="border-t border-surface-border bg-white">
        <div className="mx-auto max-w-3xl px-5 py-6 text-sm text-surface-muted">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacidad" className="hover:text-brand-blue hover:underline">
              Aviso de privacidad
            </Link>
            <Link href="/terminos" className="hover:text-brand-blue hover:underline">
              Términos y condiciones
            </Link>
            <Link href="/eliminar-cuenta" className="hover:text-brand-blue hover:underline">
              Eliminar mi cuenta
            </Link>
          </nav>
          <p className="mt-4">
            © {new Date().getFullYear()} {LEGAL.APP}
          </p>
        </div>
      </footer>
    </main>
  )
}

/** Sección con título, para no repetir clases en cada página. */
export function Seccion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-xl font-semibold text-brand-navy">{titulo}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}
