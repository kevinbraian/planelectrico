import { formatear } from '../util/numeros'
import { advertir, type Advertencia, type Regla } from './tipos'

/**
 * Lo que queda fuera de la norma cargada. La app tiene que decirlo en vez de
 * validar con reglas que no corresponden.
 */
export const r12Alcance: Regla = {
  id: 'R12',
  titulo: 'Alcance de la norma',
  evaluar({ proyecto: p, norma, calculo }) {
    const salida: Advertencia[] = []
    const alimentacion = norma.alimentacion()
    const maximoA = alimentacion.valor.corrienteMaxOrigenA

    for (const t of Object.values(p.tableros)) {
      if (t.tipo !== 'principal' || !t.cabecera || t.cabecera.inA <= maximoA) continue
      salida.push(
        advertir('R12', {
          variante: 'cabecera',
          severidad: 'error',
          objetivo: { tipo: 'tablero', id: t.id },
          referencia: alimentacion.ref,
          mensaje: `La cabecera de "${t.nombre}" es de ${formatear(t.cabecera.inA)} A y esta norma cubre instalaciones de hasta ${formatear(maximoA)} A en el origen.`,
          datos: { inA: t.cabecera.inA, maximoA },
          sugerencia: 'Una instalación mayor se proyecta con AEA 90364-7-771.',
        }),
      )
    }

    for (const r of Object.values(calculo.circuitos)) {
      const objetivo = { tipo: 'circuito', id: r.circuitoId } as const
      const tipoId = p.circuitos[r.circuitoId]?.tipo ?? ''
      if (!r.tipo) {
        salida.push(
          advertir('R12', {
            variante: 'tipo',
            severidad: 'error',
            objetivo,
            referencia: alimentacion.ref,
            mensaje: `${r.codigo} es de un tipo ("${tipoId}") que la norma cargada no conoce, así que no se puede verificar.`,
            datos: { tipo: tipoId },
          }),
        )
      } else if (!r.tipo.valor.enAlcance) {
        salida.push(
          advertir('R12', {
            variante: 'especifico',
            severidad: 'info',
            objetivo,
            referencia: r.tipo.ref,
            mensaje: `${r.codigo} es de uso específico: queda fuera de esta norma y solo se suma su demanda a la carga total. Lo define el proyectista con AEA 90364-7-771.`,
            datos: { tipo: tipoId },
          }),
        )
      }
    }
    return salida
  },
}
