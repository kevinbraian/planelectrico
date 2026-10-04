import { formatear } from '../util/numeros'
import { advertir, type Advertencia, type Regla } from './tipos'

/** Sección mínima del conductor, según el tipo de circuito. */
export const r06SeccionMinima: Regla = {
  id: 'R06',
  titulo: 'Sección mínima del conductor',
  evaluar({ proyecto, calculo }) {
    const salida: Advertencia[] = []
    for (const r of Object.values(calculo.circuitos)) {
      const seccion = proyecto.circuitos[r.circuitoId]?.conductor.seccionMm2
      if (seccion === undefined || !r.seccionMinima || seccion >= r.seccionMinima.valor) continue
      const tipo = r.tipo?.valor.id ?? 'de este tipo'
      const conTomas = r.tieneTomasDerivadas ? ' con tomacorrientes derivados' : ''
      salida.push(
        advertir('R06', {
          severidad: 'error',
          objetivo: { tipo: 'circuito', id: r.circuitoId },
          referencia: r.seccionMinima.ref,
          mensaje: `El conductor de ${r.codigo} es de ${formatear(seccion)} mm² y un circuito ${tipo}${conTomas} lleva como mínimo ${formatear(r.seccionMinima.valor)} mm².`,
          datos: { seccionMm2: seccion, minimoMm2: r.seccionMinima.valor },
        }),
      )
    }
    return salida
  },
}
