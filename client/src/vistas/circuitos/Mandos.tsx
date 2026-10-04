import { ChevronDown, Trash } from 'lucide-react'
import { describirElemento, etiquetaDeElemento } from '@/dominio/modelo/etiquetas'
import type { Boca, Mando } from '@/dominio/modelo/tipos'
import { formatear } from '@/dominio/util/numeros'
import { actualizarMando, quitarElemento } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { ICONO_MANDO } from '@/shell/iconos'
import { useResaltado } from '@/shell/navegacion'
import { Boton } from '@/ui/Boton'
import { Campo, EntradaNumero, EntradaTexto, Selector } from '@/ui/Campos'
import { cx } from '@/ui/cx'
import { Insignia } from '@/ui/Insignia'
import { TIPOS_MANDO, useOpcionesDeAmbiente } from './opciones'

/** Un interruptor, sensor o automatismo: no es boca, pero dice qué bocas maneja. */
export function FilaMando({ mando: m, bocas }: { mando: Mando; bocas: Boca[] }) {
  const { proyecto, calculo } = useAnalisis()
  const { ref, className } = useResaltado<HTMLDivElement>(m.id)
  const ambientes = useOpcionesDeAmbiente()
  const Icono = ICONO_MANDO[m.tipo]
  const maneja = calculo.cargas[m.id]?.va ?? 0
  const cantidad = m.comanda.length
  const grupo = m.grupoId ? proyecto.grupos[m.grupoId] : undefined

  return (
    <div ref={ref} className={cx('flex flex-wrap items-end gap-2 rounded-lg border border-borde p-2.5', className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-hundido text-tinta-suave">
        <Icono size={16} />
      </span>
      <Campo etiqueta="Mando" className="w-52">
        <Selector valor={m.tipo} opciones={TIPOS_MANDO} onCambio={(v) => actualizarMando(m.id, (x) => void (x.tipo = v))} />
      </Campo>
      <Campo etiqueta="Nombre" className="min-w-28 flex-1">
        <EntradaTexto
          placeholder="Opcional"
          valor={m.nombre ?? ''}
          onCambio={(v) =>
            actualizarMando(m.id, (x) => {
              if (v) x.nombre = v
              else delete x.nombre
            })
          }
        />
      </Campo>
      <Campo etiqueta="Ambiente" className="w-44">
        <Selector valor={m.ambienteId ?? ''} opciones={ambientes} onCambio={(v) => actualizarMando(m.id, (x) => void (x.ambienteId = v || null))} />
      </Campo>

      <div className="flex w-44 flex-col gap-1">
        <span className="text-xs font-medium text-tinta-suave">Comanda</span>
        <details className="relative">
          <summary className="control flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
            <span className={cantidad === 0 ? 'text-tinta-tenue' : undefined}>
              {cantidad === 0 ? 'Elegir bocas' : cantidad === 1 ? '1 boca' : `${cantidad} bocas`}
            </span>
            <ChevronDown size={14} className="text-tinta-tenue" />
          </summary>
          <div className="absolute left-0 top-full z-10 mt-1 flex max-h-60 w-72 flex-col overflow-y-auto rounded-lg border border-borde bg-panel p-1.5 shadow-flotante">
            {bocas.length === 0 && <p className="px-2 py-1.5 text-tinta-suave">El circuito todavía no tiene bocas.</p>}
            {bocas.map((b) => (
              <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hundido">
                <input
                  type="checkbox"
                  className="size-4 accent-acento"
                  checked={m.comanda.includes(b.id)}
                  onChange={(e) =>
                    actualizarMando(m.id, (x) => {
                      x.comanda = e.target.checked ? [...x.comanda, b.id] : x.comanda.filter((id) => id !== b.id)
                    })
                  }
                />
                {describirElemento(proyecto, b)}
              </label>
            ))}
          </div>
        </details>
      </div>

      <Campo etiqueta="Admite (W)" className="w-24">
        <EntradaNumero
          min={0}
          placeholder="—"
          title="Carga máxima que indica el fabricante. Vacío: no se verifica."
          valor={m.capacidadMax?.valor}
          onCambio={(v) =>
            actualizarMando(m.id, (x) => {
              if (v === undefined || v <= 0) delete x.capacidadMax
              else x.capacidadMax = { valor: v, unidad: 'W' }
            })
          }
        />
      </Campo>

      <div className="ml-auto flex h-8 items-center gap-2">
        {grupo && (
          <Insignia tono="info" title="Vino de una plantilla">
            {grupo.nombre}
          </Insignia>
        )}
        {maneja > 0 && <Insignia>maneja {formatear(maneja, 0)} VA</Insignia>}
        <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${etiquetaDeElemento(m)}`} title="Borrar" onClick={() => quitarElemento(m.id)} />
      </div>
    </div>
  )
}
