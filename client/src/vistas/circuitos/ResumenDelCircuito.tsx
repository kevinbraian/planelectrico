import { Check, X } from 'lucide-react'
import type { Paso, ResumenCircuito } from '@/dominio/calculo/tipos'
import type { Circuito } from '@/dominio/modelo/tipos'
import { advertenciasDeCircuito } from '@/dominio/reglas/filtros'
import { formatear } from '@/dominio/util/numeros'
import { useAnalisis } from '@/estado/analisis'
import { useIrAAdvertencia } from '@/shell/navegacion'
import { ItemAdvertencia } from '@/shell/PanelAdvertencias'
import { cx } from '@/ui/cx'
import { Dato, Desplegable } from '@/ui/Dato'
import { Insignia } from '@/ui/Insignia'
import { ListaDePasos } from '@/ui/Pasos'
import { Tarjeta } from '@/ui/Tarjeta'

function Corriente({ nombre, detalle, valor }: { nombre: string; detalle: string; valor: number | undefined }) {
  return (
    <span className="flex flex-col items-center px-1">
      <span className="text-base font-semibold tabular-nums">
        {nombre} {valor === undefined ? '—' : `${formatear(valor)} A`}
      </span>
      <span className="text-xs text-tinta-suave">{detalle}</span>
    </span>
  )
}

/** El "≤" entre dos corrientes, en verde si se cumple y en rojo si no. */
function MenorOIgual({ cumple }: { cumple: boolean | undefined }) {
  return (
    <span
      className={cx(
        'grid size-7 place-items-center rounded-full text-sm font-bold',
        cumple === undefined ? 'bg-hundido text-tinta-tenue' : cumple ? 'bg-ok-suave text-ok' : 'bg-error-suave text-error',
      )}
      title={cumple === undefined ? 'No se pudo verificar' : cumple ? 'Se cumple' : 'No se cumple'}
    >
      {cumple === false ? <X size={15} /> : '≤'}
    </span>
  )
}

/** Lo que pide el caso de uso "resumen al cerrar el circuito": potencia, demanda, corriente y comparación con térmica y conductor. */
export function ResumenDelCircuito({ circuito, resumen: r }: { circuito: Circuito; resumen: ResumenCircuito }) {
  const { proyecto, norma, advertencias } = useAnalisis()
  const irA = useIrAAdvertencia()
  const propias = advertenciasDeCircuito(proyecto, advertencias, circuito.id)

  const max = r.tipo?.valor.maxBocas
  const cumpleIb = r.ib.valor <= r.inA
  const cumpleIz = r.iz.ok ? r.inA <= r.iz.valor : undefined
  const seccion = circuito.conductor.seccionMm2

  const pasos: Paso[] = [...r.dpms.pasos, ...r.ib.pasos]
  if (r.iz.ok) {
    pasos.push({
      texto:
        r.iz.factorAgrupamiento < 1
          ? `Iz: ${formatear(r.iz.base)} A de tabla para ${formatear(seccion)} mm² × ${formatear(r.iz.factorAgrupamiento)} por ${circuito.conductor.circuitosEnLaCaneria} circuitos en la cañería = ${formatear(r.iz.valor)} A.`
          : `Iz: ${formatear(r.iz.valor)} A de tabla para ${formatear(seccion)} mm², con ${r.cargados} conductores cargados.`,
      ref: r.iz.refAgrupamiento ?? r.iz.ref,
    })
  }
  pasos.push({ texto: 'La térmica tiene que cubrir la demanda y proteger al conductor: Ib ≤ In ≤ Iz.', ref: norma.refCoordinacion() })

  return (
    <Tarjeta titulo="Resumen del circuito">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Dato
            etiqueta="Bocas"
            valor={r.bocas}
            detalle={max !== undefined ? `máximo ${max}` : undefined}
            tono={max !== undefined && r.bocas > max ? 'error' : undefined}
          />
          <Dato etiqueta="Potencia instalada" valor={formatear(r.potenciaInstaladaVA, 0)} unidad="VA" detalle="todo encendido" />
          <Dato
            etiqueta="Demanda (DPMS)"
            valor={formatear(r.dpms.valor, 0)}
            unidad="VA"
            detalle={r.dpmsMinima ? (r.cargaConocidaVA > r.dpmsMinima.valor ? 'carga conocida' : 'mínimo de la norma') : undefined}
          />
          <Dato
            etiqueta="Sección"
            valor={formatear(seccion)}
            unidad="mm²"
            detalle={r.seccionMinima ? `mínimo ${formatear(r.seccionMinima.valor)} mm²` : undefined}
            tono={r.seccionMinima && seccion < r.seccionMinima.valor ? 'error' : undefined}
          />
          {r.energiaMensualKWh > 0 && <Dato etiqueta="Consumo estimado" valor={formatear(r.energiaMensualKWh, 0)} unidad="kWh/mes" detalle="según horas por día" />}
          {r.tieneTomasDerivadas && <Insignia tono="info" className="self-start">Iluminación con tomas derivados</Insignia>}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-borde px-3 py-2.5">
          <Corriente nombre="Ib" detalle="demanda" valor={r.ib.valor} />
          <MenorOIgual cumple={cumpleIb} />
          <Corriente nombre="In" detalle="térmica" valor={r.inA} />
          <MenorOIgual cumple={cumpleIz} />
          <Corriente nombre="Iz" detalle="conductor" valor={r.iz.ok ? r.iz.valor : undefined} />
          <span className="ml-auto">
            {cumpleIz === undefined ? (
              <Insignia tono="aviso">Sin verificar</Insignia>
            ) : cumpleIb && cumpleIz ? (
              <Insignia tono="ok">
                <Check size={13} /> Coordinación correcta
              </Insignia>
            ) : (
              <Insignia tono="error">No cumple</Insignia>
            )}
          </span>
        </div>

        <Desplegable titulo="Cómo se calcula">
          <ListaDePasos pasos={pasos} />
        </Desplegable>

        {propias.length > 0 && (
          <ul className="flex flex-col gap-0.5 border-t border-borde pt-2">
            {propias.map((a) => (
              <li key={a.id}>
                <ItemAdvertencia advertencia={a} alElegir={irA} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tarjeta>
  )
}
