import { advertir, type Advertencia, type Regla } from './tipos'

/** Máximo de bocas por circuito, según su tipo. */
export const r03MaxBocas: Regla = {
  id: 'R03',
  titulo: 'Máximo de bocas por circuito',
  evaluar({ calculo }) {
    const salida: Advertencia[] = []
    for (const r of Object.values(calculo.circuitos)) {
      const max = r.tipo?.valor.maxBocas
      if (!r.tipo || max === undefined || r.bocas <= max) continue
      salida.push(
        advertir('R03', {
          severidad: 'error',
          objetivo: { tipo: 'circuito', id: r.circuitoId },
          referencia: r.tipo.ref,
          mensaje: `${r.codigo} tiene ${r.bocas} bocas y un circuito ${r.tipo.valor.id} admite hasta ${max}.`,
          datos: { bocas: r.bocas, maximo: max },
          sugerencia: 'Pasá bocas a otro circuito o agregá uno nuevo.',
        }),
      )
    }
    return salida
  },
}
