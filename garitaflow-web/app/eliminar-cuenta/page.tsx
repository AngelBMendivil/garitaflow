import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout, { Seccion } from '@/components/LegalLayout'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Eliminar mi cuenta — GaritaFlow',
  description:
    'Cómo eliminar tu cuenta de GaritaFlow y todos tus datos, desde la aplicación o solicitándolo por correo.',
}

const ASUNTO = encodeURIComponent('Solicitud de eliminación de cuenta — GaritaFlow')
const CUERPO = encodeURIComponent(
  'Solicito la eliminación de mi cuenta de GaritaFlow y de todos los datos asociados.\n\n' +
    'Correo con el que me registré: \n' +
    'Nombre en la cuenta: \n'
)

export default function EliminarCuenta() {
  return (
    <LegalLayout titulo="Eliminar mi cuenta">
      <Seccion titulo="Desde la aplicación, al instante">
        <p>
          Es la vía más rápida y no requiere esperar a que alguien la procese. La eliminación es
          inmediata y definitiva.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Abre GaritaFlow e inicia sesión.</li>
          <li>
            Entra a <strong>Perfil</strong>.
          </li>
          <li>
            Baja hasta <strong>Eliminar cuenta</strong>.
          </li>
          <li>Confirma. Tu cuenta y tus datos se borran en ese momento.</li>
        </ol>
      </Seccion>

      <Seccion titulo="Sin la aplicación instalada">
        <p>
          Si ya la desinstalaste o no puedes entrar, envíanos la solicitud por correo desde la
          dirección con la que te registraste.
        </p>
        <p className="pt-1">
          <a
            href={`mailto:${LEGAL.CONTACTO_EMAIL}?subject=${ASUNTO}&body=${CUERPO}`}
            className="inline-block rounded-lg bg-brand-blue px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            Solicitar eliminación por correo
          </a>
        </p>
        <p className="text-sm text-surface-muted">
          El botón abre tu programa de correo con el mensaje listo. También puedes escribir
          manualmente a {LEGAL.CONTACTO_EMAIL}.
        </p>
        <p>
          Procesamos las solicitudes en un plazo máximo de <strong>30 días</strong>. Te
          confirmaremos por correo cuando se complete. Podemos pedirte que confirmes tu
          identidad antes de proceder, para evitar que alguien más borre tu cuenta.
        </p>
      </Seccion>

      <Seccion titulo="Qué se elimina">
        <p>Al eliminar tu cuenta se borran de forma permanente:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Tu perfil: correo, nombre, contraseña, avatar y preferencias.</li>
          <li>Tu historial completo de cruces.</li>
          <li>Tus alarmas y cruces recurrentes.</li>
          <li>Tus registros de ubicación.</li>
          <li>El identificador de notificaciones de tus dispositivos.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Qué permanece, y por qué">
        <p>
          Los <strong>promedios comunitarios</strong> de tiempo de espera que ayudaste a formar
          permanecen en el sistema, pero de manera <strong>agregada y anónima</strong>: son
          cifras estadísticas que ya no están ligadas a ti ni pueden usarse para identificarte.
        </p>
        <p>
          Conservarlos es lo que permite que la app siga sirviéndole a los demás. Si eliminarlos
          fuera posible, cada baja degradaría la información de toda la comunidad.
        </p>
      </Seccion>

      <Seccion titulo="Alternativa: desactivar los avisos">
        <p>
          Si tu molestia son las notificaciones y no la cuenta en sí, puedes apagarlas desde{' '}
          <strong>Perfil → Alertas</strong> sin perder tu historial.
        </p>
      </Seccion>

      <Seccion titulo="Más información">
        <p>
          Consulta nuestro{' '}
          <Link href="/privacidad" className="font-medium text-brand-blue hover:underline">
            aviso de privacidad
          </Link>{' '}
          para conocer qué datos tratamos y por cuánto tiempo los conservamos.
        </p>
      </Seccion>
    </LegalLayout>
  )
}
