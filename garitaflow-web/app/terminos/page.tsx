import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout, { Seccion } from '@/components/LegalLayout'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Términos de Uso | GaritaFlow',
  description:
    'Consulta las reglas y condiciones para utilizar GaritaFlow.',
}

export default function Terminos() {
  return (
    <LegalLayout titulo="Términos de Uso de GaritaFlow">
      <Seccion titulo="Aceptación">
        <p>
          Al descargar, instalar o usar {LEGAL.APP} aceptas estos términos. Si no estás de
          acuerdo con ellos, no uses la aplicación ni el sitio.
        </p>
        <p>
          El servicio lo presta {LEGAL.RESPONSABLE}, a través de la aplicación móvil y del sitio{' '}
          {LEGAL.SITIO}.
        </p>
      </Seccion>

      <Seccion titulo="Qué es y qué no es GaritaFlow">
        <p>
          GaritaFlow es una herramienta <strong>informativa</strong> que estima tiempos de
          espera en garitas fronterizas combinando datos públicos de U.S. Customs and Border
          Protection con reportes de su comunidad de usuarios.
        </p>
        <div className="rounded-lg border-l-4 border-wait-high bg-orange-50 p-4">
          <p className="font-semibold text-brand-navy">Importante</p>
          <p className="mt-1 text-sm text-slate-700">
            GaritaFlow <strong>no está afiliada, patrocinada ni avalada</strong> por U.S.
            Customs and Border Protection, ni por ninguna autoridad migratoria o aduanal de
            México o Estados Unidos. No somos una fuente oficial.
          </p>
        </div>
      </Seccion>

      <Seccion titulo="Los tiempos son estimaciones, no garantías">
        <p>
          Los tiempos que mostramos son <strong>estimaciones</strong> derivadas de datos que
          pueden estar desactualizados, incompletos o ser incorrectos. Las condiciones en una
          garita cambian de un momento a otro por operativos, cierres de carril, clima o
          incidentes.
        </p>
        <p>
          <strong>
            No tomes decisiones críticas basándote únicamente en esta aplicación.
          </strong>{' '}
          Si tienes un vuelo, una cita médica, una audiencia o cualquier compromiso que no
          puedes perder, considera un margen amplio y consulta fuentes oficiales.
        </p>
        <p>
          Cuando la confianza de una estimación es baja, la aplicación te lo indica. Toma en
          cuenta ese indicador.
        </p>
      </Seccion>

      <Seccion titulo="Decisiones migratorias">
        <p>
          GaritaFlow no determina ni garantiza elegibilidad de ingreso a Estados Unidos o
          México, documentación migratoria, requisitos aduanales, SENTRI, Ready Lane, Global
          Entry ni decisiones tomadas por autoridades fronterizas.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad al conducir">
        <div className="rounded-lg border-l-4 border-wait-critical bg-red-50 p-4">
          <p className="font-semibold text-brand-navy">No uses GaritaFlow mientras conduces</p>
          <p className="mt-1 text-sm text-slate-700">
            No utilices GaritaFlow ni envíes reportes mientras conduces. Utiliza la aplicación
            únicamente cuando el vehículo se encuentre detenido de forma segura, o por medio de
            un pasajero.
          </p>
        </div>
      </Seccion>

      <Seccion titulo="Tu cuenta">
        <ul className="list-disc space-y-2 pl-5">
          <li>Debes proporcionar información veraz al registrarte.</li>
          <li>Eres responsable de mantener segura tu contraseña y de la actividad en tu cuenta.</li>
          <li>Debes tener al menos 18 años para crear una cuenta.</li>
          <li>
            Puedes eliminar tu cuenta cuando quieras, desde la aplicación o desde{' '}
            <Link
              href="/eliminar-cuenta"
              className="font-medium text-brand-blue hover:underline"
            >
              esta página
            </Link>
            .
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Reportes de la comunidad">
        <p>Al reportar el estado de una fila te comprometes a que sea información real.</p>
        <p>Queda prohibido:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Crear reportes falsos o manipular deliberadamente los tiempos.</li>
          <li>Enviar spam.</li>
          <li>Automatizar el envío de reportes sin autorización.</li>
          <li>Falsificar tu ubicación.</li>
          <li>Utilizar múltiples cuentas para manipular la información.</li>
          <li>Realizar scraping abusivo.</li>
          <li>Intentar vulnerar el sistema o interferir con el funcionamiento de GaritaFlow.</li>
          <li>
            Reportar la presencia, ubicación o actividad de agentes, autoridades, unidades
            caninas, operativos, inspecciones o puntos de revisión, así como cualquier
            información destinada a facilitar la evasión de controles fronterizos.
          </li>
          <li>Utilizar la plataforma con fines ilegales.</li>
        </ul>
        <p>
          Esa tercera restricción es deliberada y no es negociable: GaritaFlow existe para
          ahorrarte tiempo en la fila, no para facilitar la evasión de controles fronterizos.
          Las categorías de reporte disponibles están limitadas a ese propósito.
        </p>
        <p>
          Podemos suspender o eliminar cuentas que incumplan estas reglas, sin aviso previo
          cuando la conducta afecte a otros usuarios.
        </p>
      </Seccion>

      <Seccion titulo="Contenido que aportas">
        <p>
          Conservas la titularidad de los reportes y tiempos que registras. Nos concedes una
          licencia no exclusiva y gratuita para usarlos dentro del servicio, incluyendo su
          incorporación a promedios y estadísticas agregadas que se muestran a otros usuarios,
          siempre de forma que no te identifique.
        </p>
      </Seccion>

      <Seccion titulo="Disponibilidad del servicio">
        <p>
          El servicio se ofrece &ldquo;tal cual&rdquo;. No garantizamos disponibilidad
          ininterrumpida ni ausencia de errores. Podemos modificar, suspender o descontinuar
          funciones en cualquier momento. Cuando una fuente de datos falla, la aplicación lo
          indica en lugar de mostrar información que parezca vigente sin serlo.
        </p>
      </Seccion>

      <Seccion titulo="Límite de responsabilidad">
        <p>
          GaritaFlow es una herramienta informativa. En la máxima medida permitida por la
          legislación aplicable, GaritaFlow y su operador no serán responsables por daños
          indirectos derivados exclusivamente de decisiones tomadas con base en las estimaciones
          mostradas por el servicio, incluyendo retrasos, oportunidades, citas o vuelos
          perdidos.
        </p>
        <p>
          Nada de estos términos limita derechos o responsabilidades que legalmente no puedan
          excluirse.
        </p>
      </Seccion>

      <Seccion titulo="Cambios a estos términos">
        <p>
          Podemos actualizar estos términos. La versión vigente será siempre la publicada en
          esta dirección, con su fecha de actualización. Si sigues usando el servicio después de
          un cambio, se entiende que lo aceptas.
        </p>
      </Seccion>

      <Seccion titulo="Ley aplicable">
        <p>
          El servicio se opera desde San Diego, California, Estados Unidos.
        </p>
        <p>
          Conservas los derechos que te correspondan conforme a la legislación aplicable de tu
          lugar de residencia, y puedes acudir ante las autoridades competentes de tu localidad.
        </p>
      </Seccion>

      <Seccion titulo="Contacto">
        <p>
          Dudas sobre estos términos:{' '}
          <a
            href={`mailto:${LEGAL.CONTACTO_EMAIL}`}
            className="font-medium text-brand-blue hover:underline"
          >
            {LEGAL.CONTACTO_EMAIL}
          </a>
        </p>
      </Seccion>
    </LegalLayout>
  )
}
