import { formatear } from '../util/numeros'
import { advertir, type Advertencia, type Regla } from './tipos'

/** Protecciones del tablero: cabecera contra la carga total y sensibilidad de los diferenciales. */
export const r13Tablero: Regla = {
  id: 'R13',
  titulo: 'Protecciones del tablero',
  evaluar({ proyecto: p, norma, calculo }) {
    const salida: Advertencia[] = []
    const total = calculo.proyecto.corrienteTotal.valor

    for (const t of Object.values(p.tableros)) {
      if (t.tipo !== 'principal' || !t.cabecera || t.cabecera.tipo === 'seccionador') continue
      if (total <= t.cabecera.inA) continue
      salida.push(
        advertir('R13', {
          variante: 'cabecera',
          severidad: 'aviso',
          objetivo: { tipo: 'tablero', id: t.id },
          referencia: norma.refCoordinacion(),
          mensaje: `La carga total calculada (${formatear(total)} A) supera la cabecera de "${t.nombre}" (${formatear(t.cabecera.inA)} A).`,
          datos: { corrienteA: total, inA: t.cabecera.inA },
          sugerencia: 'Revisá la cabecera o los factores de uso de las cargas.',
        }),
      )
    }

    const maxima = norma.sensibilidadDiferencialMaxMa()
    for (const c of Object.values(p.circuitos)) {
      const dif = p.tableros[c.tableroId]?.diferenciales.find((d) => d.id === c.proteccion.diferencialId)
      if (!dif || dif.sensibilidadMa <= maxima.valor) continue
      const codigo = calculo.circuitos[c.id]?.codigo ?? c.nombre
      salida.push(
        advertir('R13', {
          variante: 'diferencial',
          severidad: 'aviso',
          objetivo: { tipo: 'circuito', id: c.id },
          referencia: maxima.ref,
          mensaje: `El diferencial de ${codigo} es de ${formatear(dif.sensibilidadMa)} mA: con más de ${formatear(maxima.valor)} mA no cuenta como protección complementaria contra contactos directos.`,
          datos: { sensibilidadMa: dif.sensibilidadMa, maximaMa: maxima.valor },
        }),
      )
    }
    return salida
  },
}
