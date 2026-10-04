import { ArrowRight, Plus, Trash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ResumenCircuito } from '@/dominio/calculo/tipos'
import { circuitosOrdenados, ordenar } from '@/dominio/modelo/consultas'
import type { Circuito, Tablero } from '@/dominio/modelo/tipos'
import { describirVariante } from '@/dominio/reglas/r02-circuitos-minimos'
import { formatear } from '@/dominio/util/numeros'
import {
  actualizarTablero,
  agregarCircuito,
  agregarDiferencial,
  quitarCircuito,
  quitarDiferencial,
} from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { useResaltado } from '@/shell/navegacion'
import { Boton } from '@/ui/Boton'
import { Campo, EntradaNumero, EntradaTexto, Selector, type Opcion } from '@/ui/Campos'
import { cx } from '@/ui/cx'
import { Dato, Vacio } from '@/ui/Dato'
import { Insignia } from '@/ui/Insignia'
import { Tarjeta } from '@/ui/Tarjeta'
import { camposDeCircuito } from '../circuitos/camposCircuito'
import { EstadoCircuito } from '../circuitos/EstadoCircuito'

type TipoCabecera = NonNullable<Tablero['cabecera']>['tipo']

const TIPOS_CABECERA: Opcion<TipoCabecera | ''>[] = [
  { valor: '', etiqueta: 'Sin cargar' },
  { valor: 'PIA', etiqueta: 'Termomagnética' },
  { valor: 'diferencial', etiqueta: 'Interruptor diferencial' },
  { valor: 'seccionador', etiqueta: 'Seccionador' },
]

/** Anchos de las columnas editables de la planilla; el nombre se queda con lo que sobra. */
const ANCHO_DE_COLUMNA: Record<string, string> = {
  tipo: 'w-[5.5rem]',
  termica: 'w-[5.75rem]',
  curva: 'w-[4.5rem]',
  seccion: 'w-[7.25rem]',
  caneria: 'w-[5.5rem]',
  diferencial: 'w-44',
}

const POLOS: Opcion<2 | 4>[] = [
  { valor: 2, etiqueta: 'Bipolar' },
  { valor: 4, etiqueta: 'Tetrapolar' },
]

function FilaCircuito({ circuito: c, resumen: r, tablero }: { circuito: Circuito; resumen: ResumenCircuito | undefined; tablero: Tablero }) {
  const { proyecto, norma } = useAnalisis()
  const { ref, className } = useResaltado<HTMLTableRowElement>(c.id)
  const navegar = useNavigate()
  const elegirCircuito = useUiStore((s) => s.elegirCircuito)
  const max = r?.tipo?.valor.maxBocas

  return (
    <tr ref={ref} className={cx('border-t border-borde', className)}>
      <td className="py-1.5 pl-4 pr-1.5 font-semibold tabular-nums">{r?.codigo}</td>
      {camposDeCircuito(c, norma, tablero).map((campo) => (
        <td key={campo.clave} className="px-1.5 py-1.5">
          {campo.control}
        </td>
      ))}
      <td className="px-1.5 py-1.5 tabular-nums">
        {r?.bocas ?? 0}
        {max !== undefined && <span className="text-tinta-tenue">/{max}</span>}
      </td>
      <td className="px-1.5 py-1.5 tabular-nums">{r ? formatear(r.dpms.valor, 0) : '—'}</td>
      <td className="px-1.5 py-1.5 tabular-nums">{r ? formatear(r.ib.valor) : '—'}</td>
      <td className="px-1.5 py-1.5">
        <EstadoCircuito circuitoId={c.id} />
      </td>
      <td className="whitespace-nowrap py-1.5 pl-1.5 pr-3 text-right">
        <Boton
          variante="fantasma"
          icono={<ArrowRight size={15} />}
          aria-label={`Abrir ${c.nombre}`}
          title="Ver bocas y cargas"
          onClick={() => {
            elegirCircuito(c.id)
            navegar(`/p/${proyecto.id}/circuitos`)
          }}
        />
        <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${c.nombre}`} title="Borrar el circuito y todo lo que tiene" onClick={() => quitarCircuito(c.id)} />
      </td>
    </tr>
  )
}

export function VistaTablero() {
  const { proyecto, norma, calculo } = useAnalisis()
  const resaltar = useUiStore((s) => s.resaltar)
  const tablero = ordenar(Object.values(proyecto.tableros))[0]
  if (!tablero) return <Vacio titulo="El proyecto no tiene tablero" />

  const calibres = norma.calibresComerciales().map((a) => ({ valor: a, etiqueta: `${a} A` }))
  const circuitos = circuitosOrdenados(proyecto).filter((c) => c.tableroId === tablero.id)
  const { grado, circuitosMinimos, corrienteTotal, cargaTotal } = calculo.proyecto
  const cabecera = tablero.cabecera
  const columnas = circuitos[0] ? camposDeCircuito(circuitos[0], norma, tablero) : []

  return (
    <>
      <Tarjeta titulo="Tablero principal" descripcion="La cabecera es el interruptor general del que salen todos los circuitos.">
        <div className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Nombre" className="w-56">
            <EntradaTexto valor={tablero.nombre} onCambio={(v) => actualizarTablero(tablero.id, (t) => void (t.nombre = v))} />
          </Campo>
          <Campo etiqueta="Cabecera" className="w-52">
            <Selector
              valor={cabecera?.tipo ?? ''}
              opciones={TIPOS_CABECERA}
              onCambio={(tipo) =>
                actualizarTablero(tablero.id, (t) => {
                  if (!tipo) return void delete t.cabecera
                  const sugerido = norma.calibresComerciales().find((a) => a >= corrienteTotal.valor) ?? norma.calibresComerciales().at(-1) ?? 0
                  t.cabecera = { tipo, inA: t.cabecera?.inA ?? sugerido, polos: t.cabecera?.polos ?? 2 }
                })
              }
            />
          </Campo>
          {cabecera && (
            <>
              <Campo etiqueta="Corriente nominal" className="w-28">
                <Selector valor={cabecera.inA} opciones={calibres} onCambio={(v) => actualizarTablero(tablero.id, (t) => void (t.cabecera && (t.cabecera.inA = v)))} />
              </Campo>
              <Campo etiqueta="Polos" className="w-32">
                <Selector valor={cabecera.polos} opciones={POLOS} onCambio={(v) => actualizarTablero(tablero.id, (t) => void (t.cabecera && (t.cabecera.polos = v)))} />
              </Campo>
            </>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <Dato etiqueta="Carga total" valor={formatear(cargaTotal.valor, 0)} unidad="VA" />
            <Dato
              etiqueta="Corriente total"
              valor={formatear(corrienteTotal.valor)}
              unidad="A"
              tono={cabecera && corrienteTotal.valor > cabecera.inA ? 'aviso' : undefined}
              detalle={cabecera ? `cabecera de ${cabecera.inA} A` : undefined}
            />
          </div>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Interruptores diferenciales"
        descripcion="Después se le asigna uno a cada circuito en la planilla de abajo."
        acciones={
          <Boton icono={<Plus size={16} />} onClick={() => agregarDiferencial(norma, tablero.id)}>
            Agregar diferencial
          </Boton>
        }
      >
        {tablero.diferenciales.length === 0 ? (
          <p className="text-tinta-suave">Todavía no cargaste ninguno.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tablero.diferenciales.map((d, i) => {
              const cambiar = (receta: (x: typeof d) => void) =>
                actualizarTablero(tablero.id, (t) => {
                  const actual = t.diferenciales.find((x) => x.id === d.id)
                  if (actual) receta(actual)
                })
              const protegidos = circuitos.filter((c) => c.proteccion.diferencialId === d.id).length
              return (
                <li key={d.id} className="flex flex-wrap items-end gap-3">
                  <span className="flex h-8 w-10 items-center font-semibold">ID{i + 1}</span>
                  <Campo etiqueta="Corriente nominal" className="w-28">
                    <Selector valor={d.inA} opciones={calibres} onCambio={(v) => cambiar((x) => void (x.inA = v))} />
                  </Campo>
                  <Campo etiqueta="Sensibilidad (mA)" className="w-32">
                    <EntradaNumero min={1} valor={d.sensibilidadMa} onCambio={(v) => v !== undefined && v > 0 && cambiar((x) => void (x.sensibilidadMa = v))} />
                  </Campo>
                  <Campo etiqueta="Polos" className="w-32">
                    <Selector valor={d.polos} opciones={POLOS} onCambio={(v) => cambiar((x) => void (x.polos = v))} />
                  </Campo>
                  <span className="flex h-8 items-center text-tinta-suave">
                    {protegidos === 0 ? 'Sin circuitos asignados' : protegidos === 1 ? 'Protege 1 circuito' : `Protege ${protegidos} circuitos`}
                  </span>
                  <Boton className="ml-auto" variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ID${i + 1}`} title="Borrar" onClick={() => quitarDiferencial(tablero.id, d.id)} />
                </li>
              )
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Circuitos"
        descripcion={
          grado && circuitosMinimos
            ? `Grado ${grado.valor.nombre}: como mínimo ${circuitosMinimos.valor.total} circuitos (${circuitosMinimos.valor.variantes.map(describirVariante).join(', o bien ')}).`
            : 'Cargá los ambientes para saber cuántos circuitos pide la norma como mínimo.'
        }
        acciones={norma.tiposCircuito().map((t) => (
          <Boton key={t.id} icono={<Plus size={16} />} title={`Agregar un circuito de ${t.nombre.toLowerCase()}`} onClick={() => resaltar(agregarCircuito(norma, t.id, tablero.id))}>
            {t.id === 'ESPECIFICO' ? 'Específico' : t.id}
          </Boton>
        ))}
        alBorde
      >
        {circuitos.length === 0 ? (
          <Vacio titulo="Todavía no hay circuitos">Agregá uno por cada térmica del tablero, con los botones de arriba.</Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[70rem] text-left">
              <thead className="text-xs font-medium text-tinta-suave">
                <tr>
                  <th className="w-12 py-2 pl-4 pr-1.5 font-medium">N.º</th>
                  {columnas.map((campo) => (
                    <th key={campo.clave} className={cx('px-1.5 py-2 font-medium', ANCHO_DE_COLUMNA[campo.clave])} title={campo.ayuda}>
                      {campo.etiqueta}
                    </th>
                  ))}
                  <th className="px-1.5 py-2 font-medium">Bocas</th>
                  <th className="px-1.5 py-2 font-medium" title="Demanda de potencia máxima simultánea">
                    DPMS (VA)
                  </th>
                  <th className="px-1.5 py-2 font-medium" title="Corriente de proyecto">
                    Ib (A)
                  </th>
                  <th className="px-1.5 py-2 font-medium">Estado</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {circuitos.map((c) => (
                  <FilaCircuito key={c.id} circuito={c} resumen={calculo.circuitos[c.id]} tablero={tablero} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {circuitos.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 border-t border-borde px-4 py-2.5 text-xs text-tinta-suave">
            {Object.entries(calculo.proyecto.circuitosPorTipo).map(([tipo, n]) => (
              <Insignia key={tipo}>
                {n} {tipo}
              </Insignia>
            ))}
            Las protecciones de los circuitos monofásicos son bipolares: cortan fase y neutro.
          </p>
        )}
      </Tarjeta>
    </>
  )
}
