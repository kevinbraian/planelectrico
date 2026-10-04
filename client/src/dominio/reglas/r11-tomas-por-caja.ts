import { esBoca } from '../modelo/consultas'
import { describirElemento, ETIQUETA_CAJA } from '../modelo/etiquetas'
import { advertir, type Advertencia, type Regla } from './tipos'

/** Cantidad máxima de tomacorrientes por caja. */
export const r11TomasPorCaja: Regla = {
  id: 'R11',
  titulo: 'Tomacorrientes por caja',
  evaluar({ proyecto: p, norma }) {
    const salida: Advertencia[] = []
    for (const e of Object.values(p.elementos)) {
      if (!esBoca(e) || !e.tomas || !e.caja) continue
      const maximo = norma.tomasMaxPorCaja(e.caja)
      if (!maximo || e.tomas.cantidad <= maximo.valor) continue
      salida.push(
        advertir('R11', {
          severidad: 'error',
          objetivo: { tipo: 'elemento', id: e.id },
          referencia: maximo.ref,
          mensaje: `${describirElemento(p, e)} tiene ${e.tomas.cantidad} tomacorrientes y una caja ${ETIQUETA_CAJA[e.caja].toLowerCase()} admite hasta ${maximo.valor}.`,
          datos: { tomas: e.tomas.cantidad, maximo: maximo.valor, caja: e.caja },
        }),
      )
    }
    return salida
  },
}
