import { AVISO_LEGAL } from '@/dominio/modelo/archivo'
import { REGLAS_BASE } from '@/dominio/reglas/indice'
import { FUERA_DE_LA_VERIFICACION } from '@/dominio/reglas/motor'
import { useAnalisis } from '@/estado/analisis'
import { Boton } from '@/ui/Boton'
import { Dialogo } from '@/ui/Dialogo'

const PASOS = [
  ['Ambientes', 'Cargá cada ambiente con su uso y sus m². De ahí sale el grado de electrificación.'],
  ['Tablero', 'Cargá la cabecera, los diferenciales y cada circuito con su térmica y su sección.'],
  ['Circuitos', 'A cada circuito sumale sus bocas, interruptores y lo que tiene conectado.'],
  ['Resumen', 'Mirá la demanda, las corrientes y qué cumple y qué no.'],
] as const

export function DialogoAyuda({ abierto, alCerrar }: { abierto: boolean; alCerrar(): void }) {
  const { norma } = useAnalisis()
  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo="Ayuda" pie={<Boton variante="primario" onClick={alCerrar}>Cerrar</Boton>}>
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col gap-2">
          {PASOS.map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-acento-suave text-xs font-semibold text-acento-fuerte">{i + 1}</span>
              <span>
                <strong className="font-semibold">{titulo}.</strong> {texto}
              </span>
            </li>
          ))}
        </ol>

        <p className="text-tinta-suave">
          Cada advertencia cita la cláusula o tabla de {norma.nombre} de donde sale, y al hacerle clic te lleva al elemento. Los cambios se guardan
          solos en este navegador; con Exportar te llevás una copia. Ctrl+Z deshace y Ctrl+Y rehace.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 font-semibold">Qué verifica</h3>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-tinta-suave">
              {REGLAS_BASE.map((r) => (
                <li key={r.id}>{r.titulo}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1.5 font-semibold">Qué no verifica</h3>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-tinta-suave">
              {FUERA_DE_LA_VERIFICACION.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="rounded-lg bg-aviso-suave px-3 py-2 text-aviso">{AVISO_LEGAL}</p>
      </div>
    </Dialogo>
  )
}
