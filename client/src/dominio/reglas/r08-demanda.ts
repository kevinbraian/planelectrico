import { formatear } from '../util/numeros'
import { advertir, type Advertencia, type Regla } from './tipos'

/**
 * La demanda de un circuito es la mayor entre la carga conocida y el mínimo
 * de la norma. El cálculo vive en calculo/; acá solo se avisa cuando la carga
 * real es la que manda.
 */
export const r08Demanda: Regla = {
  id: 'R08',
  titulo: 'Demanda del circuito',
  evaluar({ calculo }) {
    const salida: Advertencia[] = []
    for (const r of Object.values(calculo.circuitos)) {
      if (!r.dpmsMinima || r.cargaConocidaVA <= r.dpmsMinima.valor) continue
      salida.push(
        advertir('R08', {
          severidad: 'info',
          objetivo: { tipo: 'circuito', id: r.circuitoId },
          referencia: r.dpmsMinima.ref,
          mensaje: `La carga conocida de ${r.codigo} (${formatear(r.cargaConocidaVA)} VA) supera el mínimo de la norma (${formatear(r.dpmsMinima.valor)} VA): se calcula con la mayor.`,
          datos: { conocidaVA: r.cargaConocidaVA, minimaVA: r.dpmsMinima.valor },
        }),
      )
    }
    return salida
  },
}
