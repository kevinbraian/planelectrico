import { Plus, Trash } from 'lucide-react'
import { hijosDe } from '@/dominio/modelo/consultas'
import {
  ETIQUETA_CAJA,
  ETIQUETA_CARGA,
  ETIQUETA_CONTENEDOR,
  ETIQUETA_USO_BOCA,
  etiquetaDeElemento,
} from '@/dominio/modelo/etiquetas'
import type { Boca, Caja, Capacidad, Carga, Contenedor, Id, TipoCarga, TipoContenedor, UsoBoca } from '@/dominio/modelo/tipos'
import { capacidadEnA } from '@/dominio/calculo/potencia'
import { catalogoEfectivo } from '@/dominio/catalogo/catalogo'
import { formatear } from '@/dominio/util/numeros'
import {
  actualizarBoca,
  actualizarCarga,
  actualizarContenedor,
  agregarCarga,
  agregarCargaDelCatalogo,
  agregarContenedor,
  cambiarUsoDeBoca,
  quitarElemento,
} from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { ICONO_CARGA, ICONO_CONTENEDOR, ICONO_USO_BOCA } from '@/shell/iconos'
import { useResaltado } from '@/shell/navegacion'
import { Boton } from '@/ui/Boton'
import { Campo, EntradaNumero, EntradaTexto, Selector, type Opcion } from '@/ui/Campos'
import { cx } from '@/ui/cx'
import { Insignia } from '@/ui/Insignia'
import { opcionesDe, TIPOS_CARGA, UNIDADES, useOpcionesDeAmbiente } from './opciones'

const USOS = opcionesDe<UsoBoca>(ETIQUETA_USO_BOCA)
const CAJAS = opcionesDe<Caja>(ETIQUETA_CAJA)
const TIPOS_CONTENEDOR = opcionesDe<TipoContenedor>(ETIQUETA_CONTENEDOR)
const UNIDADES_CAPACIDAD: Opcion<'A' | 'W' | 'VA'>[] = [{ valor: 'A', etiqueta: 'A' }, ...UNIDADES]

function FilaCarga({ carga: c }: { carga: Carga }) {
  const { proyecto, calculo } = useAnalisis()
  const { ref, className } = useResaltado<HTMLDivElement>(c.id)
  const Icono = ICONO_CARGA[c.tipo]
  const total = calculo.cargas[c.id]

  return (
    <div ref={ref} className={cx('flex flex-wrap items-end gap-2 rounded-lg bg-panel p-2', className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-hundido text-tinta-suave">
        <Icono size={15} />
      </span>
      <Campo etiqueta="Carga" className="w-36">
        <Selector valor={c.tipo} opciones={TIPOS_CARGA} onCambio={(v) => actualizarCarga(c.id, (x) => void (x.tipo = v))} />
      </Campo>
      <Campo etiqueta="Qué es" className="min-w-28 flex-1">
        <EntradaTexto
          placeholder={ETIQUETA_CARGA[c.tipo]}
          valor={c.nombre ?? ''}
          onCambio={(v) =>
            actualizarCarga(c.id, (x) => {
              if (v) x.nombre = v
              else delete x.nombre
            })
          }
        />
      </Campo>
      <Campo etiqueta="Potencia" className="w-24">
        <EntradaNumero
          min={0}
          placeholder="0"
          valor={c.potencia.valor || undefined}
          onCambio={(v) => actualizarCarga(c.id, (x) => void (x.potencia.valor = Math.max(0, v ?? 0)))}
        />
      </Campo>
      <Campo etiqueta="Unidad" className="w-[4.5rem]">
        <Selector
          valor={c.potencia.unidad}
          opciones={UNIDADES}
          onCambio={(v) =>
            actualizarCarga(c.id, (x) => {
              x.potencia.unidad = v
              if (v === 'VA') delete x.potencia.fp
            })
          }
        />
      </Campo>
      {c.potencia.unidad === 'W' && (
        <Campo etiqueta="cos φ" className="w-[4.5rem]">
          <EntradaNumero
            min={0.1}
            max={1}
            paso={0.05}
            placeholder={formatear(proyecto.opciones.fpPorDefecto)}
            title="Factor de potencia. Vacío, usa el del proyecto."
            valor={c.potencia.fp}
            onCambio={(v) =>
              actualizarCarga(c.id, (x) => {
                if (v === undefined || v <= 0 || v > 1) delete x.potencia.fp
                else x.potencia.fp = v
              })
            }
          />
        </Campo>
      )}
      <Campo etiqueta="Cantidad" className="w-[4.5rem]">
        <EntradaNumero min={1} paso={1} valor={c.cantidad} onCambio={(v) => actualizarCarga(c.id, (x) => void (x.cantidad = Math.max(1, Math.round(v ?? 1))))} />
      </Campo>
      <Campo etiqueta="Uso" className="w-[4.5rem]">
        <EntradaNumero
          min={0}
          max={1}
          paso={0.1}
          placeholder="1"
          title="Factor de uso, entre 0 y 1: qué parte de la potencia cuenta para la demanda. Vacío es 1."
          valor={c.factorUso}
          onCambio={(v) =>
            actualizarCarga(c.id, (x) => {
              if (v === undefined || v < 0 || v > 1) delete x.factorUso
              else x.factorUso = v
            })
          }
        />
      </Campo>
      <Campo etiqueta="Horas/día" className="w-[4.5rem]">
        <EntradaNumero
          min={0}
          max={24}
          placeholder="—"
          title="Horas por día a potencia plena, para estimar el consumo del mes. Vacío: no suma consumo."
          valor={c.horasDia}
          onCambio={(v) =>
            actualizarCarga(c.id, (x) => {
              if (v === undefined || v < 0 || v > 24) delete x.horasDia
              else x.horasDia = v
            })
          }
        />
      </Campo>
      <div className="ml-auto flex h-8 items-center gap-2">
        {total && total.va > 0 && (
          <Insignia>
            {formatear(total.va, 0)} VA · {formatear(total.a)} A
          </Insignia>
        )}
        <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${etiquetaDeElemento(c)}`} title="Borrar" onClick={() => quitarElemento(c.id)} />
      </div>
    </div>
  )
}

function BloqueContenedor({ contenedor: r }: { contenedor: Contenedor }) {
  const { proyecto, calculo } = useAnalisis()
  const { ref, className } = useResaltado<HTMLDivElement>(r.id)
  const Icono = ICONO_CONTENEDOR[r.tipo]
  const cap = r.capacidadMax
  const unidad = 'corrienteA' in cap ? 'A' : cap.unidad
  const valor = 'corrienteA' in cap ? cap.corrienteA : cap.valor
  const capacidad = (v: number, u: 'A' | 'W' | 'VA'): Capacidad => (u === 'A' ? { corrienteA: v } : { valor: v, unidad: u })

  const totalA = calculo.cargas[r.id]?.a ?? 0
  const capacidadA = capacidadEnA(cap, calculo.proyecto.tensionV, proyecto.opciones.fpPorDefecto)

  return (
    <div ref={ref} className={cx('rounded-lg border border-borde bg-panel', className)}>
      <div className="flex flex-wrap items-end gap-2 p-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-hundido text-tinta-suave">
          <Icono size={15} />
        </span>
        <Campo etiqueta="Contiene cargas" className="w-44">
          <Selector valor={r.tipo} opciones={TIPOS_CONTENEDOR} onCambio={(v) => actualizarContenedor(r.id, (x) => void (x.tipo = v))} />
        </Campo>
        <Campo etiqueta="Nombre" className="min-w-28 flex-1">
          <EntradaTexto
            placeholder={ETIQUETA_CONTENEDOR[r.tipo]}
            valor={r.nombre ?? ''}
            onCambio={(v) =>
              actualizarContenedor(r.id, (x) => {
                if (v) x.nombre = v
                else delete x.nombre
              })
            }
          />
        </Campo>
        <Campo etiqueta="Capacidad" className="w-24">
          <EntradaNumero
            min={0}
            title="La que figura en el producto"
            valor={valor}
            onCambio={(v) => v !== undefined && v > 0 && actualizarContenedor(r.id, (x) => void (x.capacidadMax = capacidad(v, unidad)))}
          />
        </Campo>
        <Campo etiqueta="Unidad" className="w-[4.5rem]">
          <Selector valor={unidad} opciones={UNIDADES_CAPACIDAD} onCambio={(u) => actualizarContenedor(r.id, (x) => void (x.capacidadMax = capacidad(valor, u)))} />
        </Campo>
        <div className="ml-auto flex h-8 items-center gap-2">
          <Insignia tono={totalA > capacidadA ? 'error' : 'neutro'}>
            {formatear(totalA)} A de {formatear(capacidadA)} A
          </Insignia>
          <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${etiquetaDeElemento(r)}`} title="Borrar con todo lo que tiene enchufado" onClick={() => quitarElemento(r.id)} />
        </div>
      </div>
      <Conectados padreId={r.id} tipoPorDefecto="artefacto" admiteContenedor />
    </div>
  )
}

/** Lo que está enchufado o conectado a una boca o a una regleta, y los botones para sumar más. */
function Conectados({ padreId, tipoPorDefecto, admiteContenedor }: { padreId: Id; tipoPorDefecto: TipoCarga; admiteContenedor: boolean }) {
  const { proyecto } = useAnalisis()
  const resaltar = useUiStore((s) => s.resaltar)
  const hijos = hijosDe(proyecto, padreId)

  return (
    <div className="flex flex-col gap-1.5 border-t border-borde bg-hundido/70 p-2 pl-6">
      {hijos.map((h) => (h.clase === 'carga' ? <FilaCarga key={h.id} carga={h} /> : <BloqueContenedor key={h.id} contenedor={h} />))}
      <div className="flex flex-wrap gap-1">
        <Boton variante="fantasma" icono={<Plus size={15} />} onClick={() => resaltar(agregarCarga(padreId, tipoPorDefecto))}>
          {tipoPorDefecto === 'luminaria' ? 'Luminaria' : 'Carga'}
        </Boton>
        {admiteContenedor && (
          <Boton variante="fantasma" icono={<Plus size={15} />} onClick={() => resaltar(agregarContenedor(padreId, 'regleta'))}>
            Regleta o alargue
          </Boton>
        )}
        <Selector
          aria-label="Agregar un aparato del catálogo"
          className="ml-1 w-56"
          valor=""
          opciones={[
            { valor: '', etiqueta: 'Del catálogo…' },
            ...catalogoEfectivo(proyecto)
              // En un punto de luz van luminarias y ventiladores; en un toma, todo lo demás.
              .filter((a) => (tipoPorDefecto === 'luminaria' ? a.tipo === 'luminaria' || a.tipo === 'ventilador' : a.tipo !== 'luminaria'))
              .map((a) => ({ valor: a.id, etiqueta: `${a.nombre} · ${formatear(a.potencia.valor, 0)} ${a.potencia.unidad}` })),
          ]}
          onCambio={(id) => {
            if (id) resaltar(agregarCargaDelCatalogo(id, padreId))
          }}
        />
      </div>
    </div>
  )
}

/** Una boca del circuito con todo lo que tiene conectado. */
export function TarjetaBoca({ boca: b }: { boca: Boca }) {
  const { proyecto, norma, calculo } = useAnalisis()
  const { ref, className } = useResaltado<HTMLDivElement>(b.id)
  const grupo = b.grupoId ? proyecto.grupos[b.grupoId] : undefined
  const ambientes = useOpcionesDeAmbiente()
  const Icono = ICONO_USO_BOCA[b.uso]
  const total = calculo.cargas[b.id]
  const esDeLuz = b.uso === 'iluminacion'

  // Corrientes de tomacorriente que contempla la norma, según sus tipos de circuito.
  const corrientes = [...new Set(norma.tiposCircuito().flatMap((t) => (t.cargaUnitariaMaxA === undefined ? [] : [t.cargaUnitariaMaxA])))]
    .sort((x, y) => x - y)
    .map((a) => ({ valor: a, etiqueta: `${a} A` }))

  return (
    <div ref={ref} className={cx('overflow-hidden rounded-lg border border-borde', className)}>
      <div className="flex flex-wrap items-end gap-2 p-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-acento-suave text-acento-fuerte">
          <Icono size={16} />
        </span>
        <Campo etiqueta="Boca" className="w-56">
          <Selector valor={b.uso} opciones={USOS} onCambio={(v) => cambiarUsoDeBoca(norma, b.id, v)} />
        </Campo>
        <Campo etiqueta="Nombre" className="min-w-28 flex-1">
          <EntradaTexto
            placeholder="Opcional"
            valor={b.nombre ?? ''}
            onCambio={(v) =>
              actualizarBoca(b.id, (x) => {
                if (v) x.nombre = v
                else delete x.nombre
              })
            }
          />
        </Campo>
        <Campo etiqueta="Ambiente" className="w-44">
          <Selector valor={b.ambienteId ?? ''} opciones={ambientes} onCambio={(v) => actualizarBoca(b.id, (x) => void (x.ambienteId = v || null))} />
        </Campo>
        {b.tomas && (
          <>
            <Campo etiqueta="Tomas" className="w-16">
              <EntradaNumero
                min={1}
                paso={1}
                valor={b.tomas.cantidad}
                onCambio={(v) => actualizarBoca(b.id, (x) => void (x.tomas && (x.tomas.cantidad = Math.max(1, Math.round(v ?? 1)))))}
              />
            </Campo>
            <Campo etiqueta="De" className="w-24">
              <Selector valor={b.tomas.corrienteA} opciones={corrientes} onCambio={(v) => actualizarBoca(b.id, (x) => void (x.tomas && (x.tomas.corrienteA = v)))} />
            </Campo>
            <Campo etiqueta="Caja" className="w-40">
              <Selector valor={b.caja ?? 'rectangular'} opciones={CAJAS} onCambio={(v) => actualizarBoca(b.id, (x) => void (x.caja = v))} />
            </Campo>
          </>
        )}
        <div className="ml-auto flex h-8 items-center gap-2">
          {grupo && (
            <Insignia tono="info" title="Vino de una plantilla">
              {grupo.nombre}
            </Insignia>
          )}
          {total && total.va > 0 && (
            <Insignia tono="acento">
              {formatear(total.va, 0)} VA · {formatear(total.a)} A
            </Insignia>
          )}
          <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${etiquetaDeElemento(b)}`} title="Borrar con todo lo que tiene conectado" onClick={() => quitarElemento(b.id)} />
        </div>
      </div>
      <Conectados padreId={b.id} tipoPorDefecto={esDeLuz ? 'luminaria' : 'artefacto'} admiteContenedor={!esDeLuz} />
    </div>
  )
}
