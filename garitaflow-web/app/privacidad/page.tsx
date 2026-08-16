import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout, { Seccion } from '@/components/LegalLayout'
import { LEGAL, DATOS_RECOLECTADOS, PROVEEDORES } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Aviso de Privacidad | GaritaFlow',
  description:
    'Conoce cómo GaritaFlow utiliza y protege la información de sus usuarios.',
}

export default function Privacidad() {
  return (
    <LegalLayout titulo="Aviso de Privacidad de GaritaFlow">
      <Seccion titulo="Quién es responsable de tus datos">
        <p>
          {LEGAL.RESPONSABLE}, con domicilio en {LEGAL.DOMICILIO}, es responsable del
          tratamiento de tus datos personales recabados a través de la aplicación móvil
          GaritaFlow y del sitio {LEGAL.SITIO}.
        </p>
        <p>
          GaritaFlow ayuda a consultar y estimar tiempos de espera en cruces fronterizos entre
          México y Estados Unidos.
        </p>
        <p>
          Conservas los derechos que te correspondan conforme a la legislación aplicable de tu
          lugar de residencia.
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

      <Seccion titulo="Publicidad y monetización">
        <p>
          GaritaFlow puede mostrar publicidad, contenido patrocinado o recomendaciones
          comerciales. Hoy la publicidad existe únicamente en el sitio web; la aplicación móvil
          no muestra anuncios.
        </p>
        <p>
          <strong>No vendemos la ubicación precisa de nuestros usuarios</strong>, y la ubicación
          que se usa para validar cruces y reportes no se utiliza para segmentación
          publicitaria. La publicidad puede basarse en contexto general, como la sección
          consultada, la garita o la ciudad seleccionada.
        </p>
        <p>
          Si en el futuro incorporamos proveedores de publicidad o analítica que cambien lo
          anterior, actualizaremos este aviso y, cuando corresponda, te lo informaremos y
          recabaremos los consentimientos necesarios.
        </p>
      </Seccion>

      <Seccion titulo="Proveedores tecnológicos">
        <p>
          No vendemos tus datos personales. Utilizamos únicamente los proveedores necesarios
          para operar el servicio:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          {PROVEEDORES.map(([nombre, para]) => (
            <li key={nombre}>
              <strong>{nombre}</strong> — {para}
            </li>
          ))}
        </ul>
        <p>
          Nuestros servidores y los de estos proveedores se ubican en Estados Unidos, por lo que
          tu información puede procesarse fuera de tu país de residencia.
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
        <p>Conservamos cada tipo de información solo mientras es necesaria para su finalidad:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Tu cuenta y tu historial personal:</strong> mientras tu cuenta exista. Al
            eliminarla se borran.
          </li>
          <li>
            <strong>Reportes de la comunidad, registros de validación de ubicación, historial
            de notificaciones y registros técnicos:</strong> se depuran de forma periódica
            mediante un proceso automatizado, conservándose únicamente el tiempo necesario para
            la finalidad que los originó.
          </li>
          <li>
            <strong>Estadísticas agregadas o anonimizadas:</strong> pueden conservarse cuando ya
            no permitan identificarte razonablemente.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Tus derechos sobre tu información">
        <p>
          Puedes solicitar el acceso, la corrección o la eliminación de tu información, oponerte
          a determinados tratamientos o revocar tu consentimiento, conforme a la legislación
          aplicable de tu lugar de residencia.
        </p>
        <p>
          Para ejercerlos, escribe a{' '}
          <a
            href={`mailto:${LEGAL.CONTACTO_EMAIL}`}
            className="font-medium text-brand-blue hover:underline"
          >
            {LEGAL.CONTACTO_EMAIL}
          </a>{' '}
          indicando tu nombre, el correo con el que te registraste y qué deseas solicitar. Las
          solicitudes se atienden conforme a los plazos que establezca la legislación aplicable.
        </p>
        <p>
          Para eliminar tu cuenta puedes hacerlo directamente desde la aplicación, en Perfil →
          Eliminar cuenta, o desde{' '}
          <Link href="/eliminar-cuenta" className="font-medium text-brand-blue hover:underline">
            esta página
          </Link>
          , sin necesidad de instalarla.
        </p>
      </Seccion>

      <Seccion titulo="Edad mínima">
        <p>
          GaritaFlow no está dirigida a menores de edad. Debes tener al menos 18 años para
          crear una cuenta. Si detectas que un menor creó una cuenta, escríbenos y la
          eliminaremos.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>
          GaritaFlow utiliza HTTPS y medidas técnicas razonables para proteger la transmisión y
          el almacenamiento de información. Las credenciales se guardan mediante mecanismos de
          seguridad adecuados: GaritaFlow no almacena contraseñas en texto plano. Ningún sistema
          conectado a Internet puede garantizar seguridad absoluta.
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
