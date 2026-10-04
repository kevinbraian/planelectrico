import { Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import type { PmuAmbiente } from '@/dominio/calculo/tipos'
import { ordenar } from '@/dominio/modelo/consultas'
import { ETIQUETA_CERRAMIENTO } from '@/dominio/modelo/etiquetas'
import type { Ambiente, Cerramiento } from '@/dominio/modelo/tipos'
import { citar, type Normativa, type UsoAmbienteDef } from '@/dominio/normas/contrato'
import { formatear } from '@/dominio/util/numeros'
import { actualizarAmbiente, agregarAmbiente, quitarAmbiente } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { useResaltado } from '@/shell/navegacion'
import { Boton } from '@/ui/Boton'
import { EntradaNumero, EntradaTexto, Selector } from '@/ui/Campos'
import { cx } from '@/ui/cx'
import { Dato, Desplegable, Vacio } from '@/ui/Dato'
import { Insignia } from '@/ui/Insignia'
import { Cita, ListaDePasos } from '@/ui/Pasos'
import { Tarjeta } from '@/ui/Tarjeta'

const CERRAMIENTOS = (Object.keys(ETIQUETA_CERRAMIENTO) as Cerramiento[]).map((valor) => ({ valor, etiqueta: ETIQUETA_CERRAMIENTO[valor] }))

/** Bocas que tiene el ambiente contra las que pide la norma, por tipo de circuito. */
function PuntosMinimos({ pmu, norma }: { pmu: PmuAmbiente | undefined; norma: Normativa }) {
  if (!pmu?.requerido) return <span className="text-tinta-tenue">—</span>
  const { valor: req, ref } = pmu.requerido
  return (
    <div className="flex flex-wrap gap-1" title={citar(ref)}>
      {Object.entries(req.porTipo).map(([tipo, minimo]) => {
        const tiene = pmu.actual[tipo] ?? 0
        if (minimo === 0 && tiene === 0) return null
        const esDeTomas = norma.tipoCircuito(tipo)?.valor.clase === 'tomacorriente'
        const modulosMinimos = minimo + req.modulosFijos
        const modulos = pmu.modulos[tipo] ?? 0
        return (
          <span key={tipo} className="contents">
            <Insignia tono={tiene >= minimo ? 'ok' : 'error'}>
              {tipo} {tiene}/{minimo}
            </Insignia>
            {esDeTomas && req.modulosFijos > 0 && (
              <Insignia tono={modulos >= modulosMinimos ? 'ok' : 'error'} title="Módulos de tomacorriente, contando los de artefactos de ubicación fija">
                módulos {modulos}/{modulosMinimos}
              </Insignia>
            )}
          </span>
        )
      })}
      {req.faltaLargo && <Insignia tono="aviso">falta el largo</Insignia>}
    </div>
  )
}

function FilaAmbiente({ ambiente: a, usos, pmu, norma }: { ambiente: Ambiente; usos: UsoAmbienteDef[]; pmu: PmuAmbiente | undefined; norma: Normativa }) {
  const { ref, className } = useResaltado<HTMLTableRowElement>(a.id)
  const pideLargo = usos.find((u) => u.id === a.uso)?.pideLargo ?? false
  return (
    <tr ref={ref} className={cx('border-t border-borde align-top', className)}>
      <td className="py-1.5 pl-4 pr-1.5">
        <EntradaTexto aria-label="Nombre del ambiente" valor={a.nombre} onCambio={(v) => actualizarAmbiente(a.id, (x) => void (x.nombre = v))} />
      </td>
      <td className="px-1.5 py-1.5">
        <Selector
          aria-label="Uso"
          valor={a.uso}
          opciones={usos.map((u) => ({ valor: u.id, etiqueta: u.nombreCorto }))}
          onCambio={(v) => actualizarAmbiente(a.id, (x) => void (x.uso = v))}
        />
      </td>
      <td className="px-1.5 py-1.5">
        <EntradaNumero
          aria-label="Superficie en metros cuadrados"
          min={0}
          placeholder="0"
          valor={a.superficieM2 || undefined}
          onCambio={(v) => actualizarAmbiente(a.id, (x) => void (x.superficieM2 = Math.max(0, v ?? 0)))}
        />
      </td>
      <td className="px-1.5 py-1.5">
        <Selector aria-label="Cerramiento" valor={a.cerramiento} opciones={CERRAMIENTOS} onCambio={(v) => actualizarAmbiente(a.id, (x) => void (x.cerramiento = v))} />
      </td>
      <td className="px-1.5 py-1.5">
        {pideLargo ? (
          <EntradaNumero
            aria-label="Largo en metros"
            min={0}
            placeholder="m"
            valor={a.largoM}
            onCambio={(v) =>
              actualizarAmbiente(a.id, (x) => {
                if (v === undefined || v <= 0) delete x.largoM
                else x.largoM = v
              })
            }
          />
        ) : (
          <span className="flex h-8 items-center text-tinta-tenue">—</span>
        )}
      </td>
      <td className="px-1.5 py-2.5">
        <PuntosMinimos pmu={pmu} norma={norma} />
      </td>
      <td className="py-1.5 pl-1.5 pr-3 text-right">
        <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${a.nombre}`} title="Borrar" onClick={() => quitarAmbiente(a.id)} />
      </td>
    </tr>
  )
}

export function VistaAmbientes() {
  const { proyecto, norma, calculo } = useAnalisis()
  const resaltar = useUiStore((s) => s.resaltar)
  const usos = norma.usosDeAmbiente()
  const [usoNuevo, setUsoNuevo] = useState(usos[0]?.id ?? '')
  const ambientes = ordenar(Object.values(proyecto.ambientes))
  const r = calculo.proyecto
  const minimos = r.circuitosMinimos?.valor

  const agregar = (
    <div className="flex items-center gap-2">
      <Selector
        aria-label="Uso del ambiente a agregar"
        className="w-56"
        valor={usoNuevo}
        opciones={usos.map((u) => ({ valor: u.id, etiqueta: u.nombreCorto }))}
        onCambio={(v) => setUsoNuevo(v)}
      />
      <Boton variante="primario" icono={<Plus size={16} />} onClick={() => resaltar(agregarAmbiente(norma, usoNuevo))}>
        Agregar
      </Boton>
    </div>
  )

  return (
    <>
      <Tarjeta titulo="Superficie y grado de electrificación" descripcion="El grado define cuántos circuitos y cuántas bocas pide la norma como mínimo.">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Dato etiqueta="Cubierta" valor={formatear(r.cubiertaM2)} unidad="m²" />
            <Dato etiqueta="Semicubierta" valor={formatear(r.semicubiertaM2)} unidad="m²" />
            <Dato etiqueta="Computable" valor={formatear(r.superficie.valor)} unidad="m²" />
            <Dato etiqueta="Grado" valor={r.grado?.valor.nombre ?? '—'} detalle={r.grado?.detalle} />
            <Dato etiqueta="Circuitos mínimos" valor={minimos?.total ?? '—'} />
          </div>
          {proyecto.superficieManual && (
            <p className="text-xs text-aviso">La superficie está cargada a mano en las opciones del proyecto; los m² de los ambientes no se suman.</p>
          )}
          <Desplegable titulo="Cómo se calcula">
            <ListaDePasos pasos={r.superficie.pasos} />
            {r.grado && (
              <p className="mt-1.5 flex flex-col">
                Le corresponde el grado {r.grado.valor.nombre}: {r.grado.detalle}.
                <Cita referencia={r.grado.ref} />
              </p>
            )}
          </Desplegable>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Ambientes"
        descripcion="Un ambiente integrado (cocina-comedor) se carga como dos, cada uno con sus m²."
        acciones={agregar}
        alBorde
      >
        {ambientes.length === 0 ? (
          <Vacio titulo="Todavía no hay ambientes">Elegí un uso y tocá Agregar, o usá la paleta de la izquierda.</Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="text-xs font-medium text-tinta-suave">
                <tr>
                  <th className="w-[22%] py-2 pl-4 pr-1.5 font-medium">Nombre</th>
                  <th className="w-[22%] px-1.5 py-2 font-medium">Uso</th>
                  <th className="w-[10%] px-1.5 py-2 font-medium">Superficie (m²)</th>
                  <th className="w-[14%] px-1.5 py-2 font-medium">Cerramiento</th>
                  <th className="w-[9%] px-1.5 py-2 font-medium">Largo (m)</th>
                  <th className="px-1.5 py-2 font-medium">Puntos mínimos</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {ambientes.map((a) => (
                  <FilaAmbiente key={a.id} ambiente={a} usos={usos} pmu={calculo.ambientes[a.id]} norma={norma} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  )
}
