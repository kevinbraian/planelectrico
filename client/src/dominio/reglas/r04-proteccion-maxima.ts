import { formatear } from '../util/numeros'
import { advertir, type Advertencia, type Regla } from './tipos'

/** Calibre máximo de la protección, según el tipo de circuito. */
export const r04ProteccionMaxima: Regla = {
  id: 'R04',
  titulo: 'Calibre máximo de la protección',
  evaluar({ calculo }) {
    const salida: Advertencia[] = []
    for (const r of Object.values(calculo.circuitos)) {
      const max = r.tipo?.valor.maxProteccionA
      if (!r.tipo || max === undefined || r.inA <= max) continue
      salida.push(
        advertir('R04', {
          severidad: 'error',
          objetivo: { tipo: 'circuito', id: r.circuitoId },
          referencia: r.tipo.ref,
          mensaje: `La térmica de ${r.codigo} es de ${formatear(r.inA)} A y un circuito ${r.tipo.valor.id} admite como máximo ${formatear(max)} A.`,
          datos: { inA: r.inA, maximoA: max },
        }),
      )
    }
    return salida
  },
}
