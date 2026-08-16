import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout, { Seccion } from '@/components/LegalLayout'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Términos y condiciones — GaritaFlow',
  description:
    'Condiciones de uso de la aplicación y el sitio GaritaFlow: cuentas, reportes de la comunidad, límites de responsabilidad.',
}

export default function Terminos() {
  return (
    <LegalLayout titulo="Términos y condiciones">
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

      <Seccion titulo="Tu cuenta">
        <ul className="list-disc space-y-2 pl-5">
          <li>Debes proporcionar información veraz al registrarte.</li>
          <li>Eres responsable de mantener segura tu contraseña y de la actividad en tu cuenta.</li>
          <li>Debes tener al menos 13 años para crear una cuenta.</li>
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
          <li>Enviar reportes falsos o manipular deliberadamente los tiempos.</li>
          <li>
            Automatizar el envío de reportes, usar múltiples cuentas o falsear tu ubicación.
          </li>
          <li>
            Reportar la presencia, ubicación o actividad de agentes, autoridades, unidades
            caninas o puntos de inspección.
          </li>
          <li>Usar el servicio para cualquier fin ilícito.</li>
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
          En la máxima medida permitida por la ley aplicable, {LEGAL.RESPONSABLE} no será
          responsable por daños indirectos, incidentales o consecuenciales derivados del uso de
          GaritaFlow, incluyendo pérdidas por tiempo de espera, oportunidades, citas o vuelos
          perdidos, ni por decisiones tomadas con base en la información mostrada.
        </p>
        <p>
          Nada en estos términos limita la responsabilidad que no pueda excluirse conforme a la
          legislación mexicana aplicable en materia de protección al consumidor.
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
          El servicio se opera desde San Diego, California, Estados Unidos. Estos términos se
          rigen por las leyes del Estado de California y de los Estados Unidos de América, sin
          atender a sus normas de conflicto de leyes.
        </p>
        <p>
          Lo anterior <strong>no te priva</strong> de los derechos que la legislación de tu país
          de residencia te otorgue de forma irrenunciable. Si resides en México, conservas las
          protecciones que la ley mexicana en materia de consumo y protección de datos te
          reconozca, y puedes acudir ante las autoridades competentes de tu localidad.
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
