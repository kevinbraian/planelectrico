import { CircuitBoard, Library, Search, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { codigoCircuito } from '@/dominio/modelo/consultas'
import { ETIQUETA_MANDO, ETIQUETA_USO_BOCA } from '@/dominio/modelo/etiquetas'
import type { TipoMando, UsoBoca } from '@/dominio/modelo/tipos'
import { plantillasDisponibles } from '@/dominio/plantillas/biblioteca'
import {
  agregarAmbiente,
  agregarBoca,
  agregarCircuito,
  agregarDiferencial,
  agregarMando,
} from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { Insignia } from '@/ui/Insignia'
import { ICONO_MANDO, ICONO_USO_BOCA, iconoDeAmbiente } from './iconos'
import { useAmbienteParaLoNuevo, useCircuitoActivo, usePestanaActiva } from './navegacion'

interface Item {
  id: string
  etiqueta: string
  icono: LucideIcon
  alElegir?: () => void
}

interface Categoria {
  titulo: string
  items: Item[]
  nota?: string
}

const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const INTERRUPTORES: TipoMando[] = ['interruptor', 'conmutador', 'cruzamiento', 'pulsador', 'atenuador']
const AUTOMATISMOS: TipoMando[] = ['sensor_movimiento', 'fotocelula', 'temporizador', 'automatico_escalera']

/**
 * Paleta de la izquierda: lo que se puede agregar en la pestaña activa. Un clic
 * lo suma al proyecto. En la fase del plano, estos mismos ítems se arrastran.
 */
export function PanelLateral() {
  const pestana = usePestanaActiva()
  const { proyecto, norma } = useAnalisis()
  const circuito = useCircuitoActivo()
  const ambienteId = useAmbienteParaLoNuevo()
  const { resaltar, elegirCircuito, insertarPlantilla } = useUiStore.getState()
  const [busqueda, setBusqueda] = useState('')

  let titulo = ''
  const categorias: Categoria[] = []

  const tiposDeCircuito: Item[] = norma.tiposCircuito().map((t) => ({
    id: t.id,
    etiqueta: `${t.id} · ${t.nombre}`,
    icono: CircuitBoard,
    alElegir: () => {
      const id = agregarCircuito(norma, t.id)
      elegirCircuito(id)
      resaltar(id)
    },
  }))

  if (pestana === 'ambientes') {
    titulo = 'Agregar un ambiente'
    categorias.push({
      titulo: 'Ambientes',
      items: norma.usosDeAmbiente().map((u) => ({
        id: u.id,
        etiqueta: u.nombreCorto,
        icono: iconoDeAmbiente(u.id),
        alElegir: () => resaltar(agregarAmbiente(norma, u.id)),
      })),
    })
  } else if (pestana === 'tablero') {
    titulo = 'Agregar al tablero'
    const tablero = Object.values(proyecto.tableros).sort((a, b) => a.orden - b.orden)[0]
    categorias.push({ titulo: 'Circuitos', items: tiposDeCircuito })
    categorias.push({
      titulo: 'Protecciones',
      items: [
        {
          id: 'diferencial',
          etiqueta: 'Interruptor diferencial',
          icono: ShieldCheck,
          alElegir: tablero ? () => agregarDiferencial(norma, tablero.id) : undefined,
        },
      ],
    })
  } else if (pestana === 'circuitos') {
    if (!circuito) {
      titulo = 'Empezá por un circuito'
      categorias.push({ titulo: 'Circuitos', items: tiposDeCircuito })
    } else {
      titulo = `Agregar a ${codigoCircuito(proyecto, circuito.id)} · ${circuito.nombre}`
      const boca = (uso: UsoBoca): Item => ({
        id: uso,
        etiqueta: ETIQUETA_USO_BOCA[uso],
        icono: ICONO_USO_BOCA[uso],
        alElegir: () => resaltar(agregarBoca(norma, circuito.id, uso, ambienteId)),
      })
      const mando = (tipo: TipoMando): Item => ({
        id: tipo,
        etiqueta: ETIQUETA_MANDO[tipo],
        icono: ICONO_MANDO[tipo],
        alElegir: () => resaltar(agregarMando(circuito.id, tipo, ambienteId)),
      })
      categorias.push(
        { titulo: 'Iluminación', items: [boca('iluminacion')] },
        { titulo: 'Tomas de corriente', items: [boca('tomacorriente'), boca('mixta'), boca('conexion_fija')] },
        { titulo: 'Interruptores', items: INTERRUPTORES.map(mando) },
        { titulo: 'Sensores y automatismos', items: AUTOMATISMOS.map(mando) },
        {
          titulo: 'Plantillas',
          nota: 'Circuitos prearmados: se insertan acá y se pueden combinar con lo que ya hay.',
          items: plantillasDisponibles(proyecto).map((x) => ({
            id: x.id,
            etiqueta: x.nombre,
            icono: Library,
            alElegir: () => insertarPlantilla(x.id),
          })),
        },
      )
    }
  }

  if (categorias.length === 0) return null

  const consulta = sinTildes(busqueda.trim())
  const filtradas = categorias
    .map((c) => ({ ...c, items: c.items.filter((i) => sinTildes(i.etiqueta).includes(consulta)) }))
    .filter((c) => c.items.length > 0)

  return (
    <aside aria-label="Paleta" className="hidden w-64 shrink-0 flex-col border-r border-borde bg-panel lg:flex">
      <div className="flex flex-col gap-2 border-b border-borde p-3">
        <p className="truncate text-xs font-medium text-tinta-suave" title={titulo}>
          {titulo}
        </p>
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-tenue" />
          <input
            type="search"
            className="control pl-8"
            placeholder="Buscar…"
            aria-label="Buscar en la paleta"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {filtradas.length === 0 && <p className="px-2 py-6 text-center text-tinta-suave">Nada coincide con la búsqueda.</p>}
        {filtradas.map((c) => (
          <details key={c.titulo} open className="group rounded-lg border border-borde">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span className="text-tinta-tenue transition-transform group-open:rotate-90">›</span>
                {c.titulo}
              </span>
              <Insignia>{c.items.length}</Insignia>
            </summary>
            {c.nota && <p className="px-3 pb-2 text-xs text-tinta-suave">{c.nota}</p>}
            <ul className="flex flex-col px-1.5 pb-1.5">
              {c.items.map(({ id, etiqueta, icono: Icono, alElegir }) => (
                <li key={id}>
                  <button
                    type="button"
                    disabled={!alElegir}
                    onClick={alElegir}
                    title={alElegir ? `Agregar: ${etiqueta}` : undefined}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors enabled:hover:bg-acento-suave enabled:hover:text-acento-fuerte disabled:text-tinta-tenue"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md border border-borde bg-panel">
                      <Icono size={15} />
                    </span>
                    <span className="min-w-0 truncate">{etiqueta}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </aside>
  )
}
