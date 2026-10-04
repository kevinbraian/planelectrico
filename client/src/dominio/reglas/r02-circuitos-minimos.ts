import type { VarianteCircuitos } from '../normas/contrato'
import { advertir, type Regla } from './tipos'

/** "2 IUG + 1 TUG + 1 de libre elección" */
export const describirVariante = (v: VarianteCircuitos): string => {
  const partes = Object.entries(v.porTipo)
    .filter(([, n]) => n > 0)
    .map(([tipo, n]) => `${n} ${tipo}`)
  if (v.libre > 0) partes.push(`${v.libre} de libre elección`)
  return partes.join(' + ')
}

/** Cantidad mínima de circuitos del grado: alcanza con cumplir una de las variantes. */
export const r02CircuitosMinimos: Regla = {
  id: 'R02',
  titulo: 'Cantidad mínima de circuitos',
  evaluar({ proyecto, calculo }) {
    const { grado, circuitosMinimos, circuitosPorTipo } = calculo.proyecto
    if (!grado || !circuitosMinimos) return []

    const total = Object.values(circuitosPorTipo).reduce((a, b) => a + b, 0)
    const cumple = (v: VarianteCircuitos) => {
      const exigidos = Object.values(v.porTipo).reduce((a, b) => a + b, 0)
      return (
        Object.entries(v.porTipo).every(([tipo, n]) => (circuitosPorTipo[tipo] ?? 0) >= n) && total >= exigidos + v.libre
      )
    }
    const { variantes, total: minimo } = circuitosMinimos.valor
    if (total >= minimo && variantes.some(cumple)) return []

    const tiene = Object.entries(circuitosPorTipo)
      .map(([tipo, n]) => `${n} ${tipo}`)
      .join(', ')
    return [
      advertir('R02', {
        severidad: 'error',
        objetivo: { tipo: 'proyecto', id: proyecto.id },
        referencia: circuitosMinimos.ref,
        mensaje: `El grado ${grado.valor.nombre} exige como mínimo ${minimo} circuitos: ${variantes.map(describirVariante).join(', o bien ')}. El proyecto tiene ${tiene || 'ninguno'}.`,
        datos: { minimo, total, grado: grado.valor.id },
        sugerencia: 'Agregá los circuitos que faltan desde la pestaña Tablero.',
      }),
    ]
  },
}
