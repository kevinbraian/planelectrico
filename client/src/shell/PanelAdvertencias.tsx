import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { Advertencia, Severidad } from '@/dominio/reglas/tipos'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { Boton } from '@/ui/Boton'
import { cx } from '@/ui/cx'
import { Cita } from '@/ui/Pasos'
import { useIrAAdvertencia } from './navegacion'

const ASPECTO: Record<Severidad, { icono: LucideIcon; color: string; plural: string }> = {
  error: { icono: CircleAlert, color: 'text-error', plural: 'Errores' },
  aviso: { icono: TriangleAlert, color: 'text-aviso', plural: 'Avisos' },
  info: { icono: Info, color: 'text-info', plural: 'Información' },
}

/** Una advertencia: mensaje, sugerencia y la cita de la norma. Si recibe `alElegir`, es un botón que lleva al objetivo. */
export function ItemAdvertencia({ advertencia: a, alElegir }: { advertencia: Advertencia; alElegir?: (a: Advertencia) => void }) {
  const { icono: Icono, color } = ASPECTO[a.severidad]
  const contenido = (
    <>
      <Icono size={16} className={cx('mt-0.5 shrink-0', color)} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>{a.mensaje}</span>
        {a.sugerencia && <span className="text-tinta-suave">{a.sugerencia}</span>}
        <Cita referencia={a.referencia} />
      </span>
    </>
  )
  if (!alElegir) return <div className="flex items-start gap-2 text-left">{contenido}</div>
  return (
    <button
      type="button"
      onClick={() => alElegir(a)}
      className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-hundido"
    >
      {contenido}
    </button>
  )
}

const FILTROS: (Severidad | 'todas')[] = ['todas', 'error', 'aviso', 'info']

/** Panel derecho con todas las advertencias. Cada una lleva al elemento que hay que corregir. */
export function PanelAdvertencias() {
  const { advertencias, proyecto } = useAnalisis()
  const [filtro, setFiltro] = useState<Severidad | 'todas'>('todas')
  const cerrar = useUiStore((s) => s.alternarAdvertencias)
  const irA = useIrAAdvertencia()

  const cantidad = (s: Severidad | 'todas') => (s === 'todas' ? advertencias.length : advertencias.filter((a) => a.severidad === s).length)
  const visibles = filtro === 'todas' ? advertencias : advertencias.filter((a) => a.severidad === filtro)
  const incumple = advertencias.some((a) => a.severidad === 'error')

  return (
    <aside
      aria-label="Advertencias"
      className="flex w-80 shrink-0 flex-col border-l border-borde bg-panel max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:z-20 max-xl:shadow-flotante"
    >
      <header className="flex items-center justify-between gap-2 border-b border-borde px-3 py-2">
        <h2 className="font-semibold">Advertencias</h2>
        <Boton variante="fantasma" icono={<X size={16} />} aria-label="Cerrar advertencias" onClick={cerrar} />
      </header>

      <div className="flex flex-wrap gap-1 border-b border-borde px-3 py-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={cx(
              'rounded-md px-2 py-1 text-xs font-medium tabular-nums transition-colors',
              filtro === f ? 'bg-acento-suave text-acento-fuerte' : 'text-tinta-suave hover:bg-hundido',
            )}
          >
            {f === 'todas' ? 'Todas' : ASPECTO[f].plural} {cantidad(f)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {incumple && proyecto.modo === 'relevamiento' && (
          <p className="mx-1.5 mb-1.5 rounded-lg bg-hundido px-2.5 py-2 text-xs text-tinta-suave">
            Es un relevamiento: los errores marcan lo que no cumple la reglamentación vigente, aunque la instalación sea anterior a ella.
          </p>
        )}
        {visibles.length === 0 ? (
          <p className="flex flex-col items-center gap-2 px-4 py-10 text-center text-tinta-suave">
            <CircleCheck size={22} className="text-ok" />
            Nada para mostrar acá.
          </p>
        ) : (
          <ul className="flex flex-col">
            {visibles.map((a) => (
              <li key={a.id}>
                <ItemAdvertencia advertencia={a} alElegir={irA} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
