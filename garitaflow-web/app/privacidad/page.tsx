import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout, { Seccion } from '@/components/LegalLayout'
import { LEGAL, DATOS_RECOLECTADOS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Aviso de privacidad — GaritaFlow',
  description:
    'Qué datos recolecta GaritaFlow, para qué los usa, con quién los comparte y cómo ejercer tus derechos ARCO.',
}

export default function Privacidad() {
  return (
    <LegalLayout titulo="Aviso de privacidad">
      <Seccion titulo="Quién es responsable de tus datos">
        <p>
          {LEGAL.RESPONSABLE}, con domicilio en {LEGAL.DOMICILIO}, es responsable del
          tratamiento de tus datos personales recabados a través de la aplicación móvil
          GaritaFlow y del sitio {LEGAL.SITIO}.
        </p>
        <p>
          El servicio se opera desde Estados Unidos y sus usuarios se encuentran
          principalmente en México y Estados Unidos. Por ello, este aviso se redacta
          incorporando los principios de la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (LFPDPPP) de México, y reconocemos los derechos que la
          legislación de California otorga a sus residentes.
        </p>
        <p>
          Si resides en México, te reconocemos los derechos ARCO descritos más adelante
          independientemente de que el responsable esté domiciliado fuera del país.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos recabamos y para qué">
        <p>
          Solo pedimos lo que la aplicación necesita para funcionar. Esta es la lista completa:
        </p>
        <div className="mt-4 space-y-4">
          {DATOS_RECOLECTADOS.map((d) => (
            <div
              key={d.categoria}
              className="rounded-lg border border-surface-border bg-white p-4"
            >
              <h3 className="font-semibold text-brand-navy">{d.categoria}</h3>
              <p className="mt-1 text-sm text-slate-700">{d.detalle}</p>
              <p className="mt-2 text-sm text-surface-muted">
                <span className="font-medium text-slate-600">Para qué: </span>
                {d.finalidad}
              </p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Sobre tu ubicación, en concreto">
        <p>
          La ubicación es el dato más delicado que manejamos, así que queremos ser explícitos:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Se obtiene <strong>únicamente mientras tienes la aplicación abierta</strong>. No
            usamos ubicación en segundo plano y la app no puede seguirte cuando está cerrada.
          </li>
          <li>
            Se usa para saber si estás dentro de la zona de una garita. Puedes negar el permiso
            y la aplicación seguirá funcionando, con funciones reducidas.
          </li>
          <li>
            Tu ubicación <strong>nunca se muestra a otros usuarios</strong>. Los reportes que
            haces aparecen asociados a la garita, no a ti ni a tu posición exacta.
          </li>
          <li>
            Puedes revocar el permiso en cualquier momento desde los ajustes de tu teléfono.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Con quién compartimos datos">
        <p>No vendemos tus datos personales. Los compartimos solo con quien es indispensable:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Railway</strong> — aloja nuestros servidores y base de datos.
          </li>
          <li>
            <strong>Expo</strong> — entrega las notificaciones a tu dispositivo.
          </li>
          <li>
            <strong>Google</strong> — si eliges iniciar sesión con tu cuenta de Google, y a
            través de Google Tag Manager y servicios de publicidad en nuestro sitio web.
          </li>
        </ul>
        <p>
          Nuestro sitio web utiliza <strong>cookies de analítica y publicidad</strong> de
          terceros. La aplicación móvil no muestra publicidad.
        </p>
        <p>
          Nuestros servidores y los de estos proveedores se ubican en Estados Unidos. Si
          resides en México, tus datos se transfieren y procesan fuera del país. Al usar el
          servicio consientes esa transferencia, necesaria para poder prestarlo.
        </p>
        <p className="rounded-lg border border-surface-border bg-white p-4 text-sm">
          <strong className="text-brand-navy">No vendemos tus datos personales</strong> ni los
          compartimos para publicidad conductual entre sitios, en el sentido que dan a esos
          términos las leyes de privacidad de California.
        </p>
      </Seccion>

      <Seccion titulo="De dónde vienen los tiempos de espera">
        <p>
          Los tiempos oficiales provienen del servicio público de U.S. Customs and Border
          Protection. Los tiempos comunitarios son el promedio de los cruces que registran
          nuestros usuarios, siempre de forma agregada y anónima. Nunca publicamos el cruce
          individual de una persona.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo conservamos tu información">
        <ul className="list-disc space-y-2 pl-5">
          <li>Reportes de la comunidad: 24 horas.</li>
          <li>Registros de ubicación asociados a validación: 30 días.</li>
          <li>Historial de notificaciones enviadas: 45 días.</li>
          <li>Registros técnicos de errores: 90 días.</li>
          <li>
            Cuenta e historial de cruces: mientras tu cuenta exista. Al eliminarla se borran.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Tus derechos ARCO">
        <p>
          Tienes derecho a <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong>{' '}
          si son inexactos, <strong>cancelarlos</strong> cuando consideres que no son
          necesarios, y <strong>oponerte</strong> a su tratamiento para fines específicos.
          También puedes revocar tu consentimiento en cualquier momento.
        </p>
        <p>
          Para ejercerlos, escribe a{' '}
          <a
            href={`mailto:${LEGAL.CONTACTO_EMAIL}`}
            className="font-medium text-brand-blue hover:underline"
          >
            {LEGAL.CONTACTO_EMAIL}
          </a>{' '}
          indicando tu nombre, el correo con el que te registraste y qué derecho deseas
          ejercer. Responderemos en un plazo máximo de 20 días hábiles.
        </p>
        <p>
          Para eliminar tu cuenta puedes hacerlo directamente desde la aplicación, en Perfil →
          Eliminar cuenta, o desde{' '}
          <Link href="/eliminar-cuenta" className="font-medium text-brand-blue hover:underline">
            esta página
          </Link>
          , sin necesidad de instalarla.
        </p>
        <p>
          <strong>Si resides en California</strong>, además puedes solicitar el detalle de las
          categorías de información que recabamos, pedir su eliminación y ejercer tu derecho a
          no ser discriminado por ejercerlos. Se solicitan por el mismo correo.
        </p>
        <p>
          Si consideras que tu derecho a la protección de datos fue vulnerado y resides en
          México, puedes acudir al INAI.
        </p>
      </Seccion>

      <Seccion titulo="Menores de edad">
        <p>
          GaritaFlow no está dirigida a menores de 13 años y no recabamos datos de forma
          consciente de personas de esa edad. Si detectas que un menor creó una cuenta,
          escríbenos y la eliminaremos.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>
          Las contraseñas se almacenan cifradas y nunca en texto plano. La comunicación entre la
          aplicación y nuestros servidores viaja siempre por HTTPS. Aun así, ningún sistema es
          infalible: si ocurriera una vulneración que afecte tus datos, te lo notificaremos.
        </p>
      </Seccion>

      <Seccion titulo="Cambios a este aviso">
        <p>
          Si modificamos este aviso publicaremos la nueva versión en esta misma dirección y
          actualizaremos la fecha del encabezado. Los cambios importantes se avisarán dentro de
          la aplicación.
        </p>
      </Seccion>

      <Seccion titulo="Contacto">
        <p>
          Dudas sobre este aviso o sobre el manejo de tus datos:{' '}
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
