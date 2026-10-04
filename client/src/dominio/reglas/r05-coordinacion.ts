import { formatear } from '../util/numeros'
import { advertir, type Advertencia, type Regla } from './tipos'

const MOTIVO = {
  metodo: 'el método de instalación del circuito no está entre las tablas cargadas',
  seccion: 'la sección del conductor no figura en la tabla cargada',
  agrupamiento: 'la tabla de agrupamiento cargada no cubre esa cantidad de circuitos en una misma cañería',
} as const

/** Ib ≤ In ≤ Iz: la térmica cubre la demanda y protege al conductor. */
export const r05Coordinacion: Regla = {
  id: 'R05',
  titulo: 'Coordinación Ib ≤ In ≤ Iz',
  evaluar({ proyecto, norma, calculo }) {
    const salida: Advertencia[] = []
    const referencia = norma.refCoordinacion()

    for (const r of Object.values(calculo.circuitos)) {
      const objetivo = { tipo: 'circuito', id: r.circuitoId } as const
      const circuito = proyecto.circuitos[r.circuitoId]
      if (!circuito) continue

      if (r.ib.valor > r.inA) {
        salida.push(
          advertir('R05', {
            variante: 'ib',
            severidad: 'error',
            objetivo,
            referencia,
            mensaje: `La demanda de ${r.codigo} (${formatear(r.ib.valor)} A) supera su térmica (${formatear(r.inA)} A).`,
            datos: { ibA: r.ib.valor, inA: r.inA },
            sugerencia: 'Repartí la carga en otro circuito, o subí la térmica y la sección.',
          }),
        )
      }

      if (!r.iz.ok) {
        salida.push(
          advertir('R05', {
            variante: 'sin-iz',
            severidad: 'aviso',
            objetivo,
            referencia,
            mensaje: `No se pudo verificar que la térmica de ${r.codigo} proteja al conductor: ${MOTIVO[r.iz.falta]}.`,
            datos: { falta: r.iz.falta },
          }),
        )
        continue
      }

      if (r.inA > r.iz.valor) {
        const agrupado =
          r.iz.factorAgrupamiento < 1
            ? ` (${formatear(r.iz.base)} A de tabla × ${formatear(r.iz.factorAgrupamiento)} por compartir la cañería)`
            : ''
        salida.push(
          advertir('R05', {
            variante: 'iz',
            severidad: 'error',
            objetivo,
            referencia,
            mensaje: `La térmica de ${r.codigo} (${formatear(r.inA)} A) no protege al conductor de ${formatear(circuito.conductor.seccionMm2)} mm², que admite ${formatear(r.iz.valor)} A${agrupado}.`,
            datos: { inA: r.inA, izA: r.iz.valor, seccionMm2: circuito.conductor.seccionMm2 },
            sugerencia: 'Bajá el calibre de la térmica o aumentá la sección del conductor.',
          }),
        )
      }
    }
    return salida
  },
}
