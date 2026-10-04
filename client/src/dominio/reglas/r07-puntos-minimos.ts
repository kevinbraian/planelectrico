import { advertir, type Advertencia, type Regla } from './tipos'

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Puntos mínimos de utilización por ambiente y grado. */
export const r07PuntosMinimos: Regla = {
  id: 'R07',
  titulo: 'Puntos mínimos de utilización',
  evaluar({ proyecto, norma, calculo }) {
    const salida: Advertencia[] = []
    if (!calculo.proyecto.grado) return salida

    for (const a of Object.values(proyecto.ambientes)) {
      const pmu = calculo.ambientes[a.id]
      const objetivo = { tipo: 'ambiente', id: a.id } as const

      if (!pmu?.requerido) {
        salida.push(
          advertir('R07', {
            variante: 'uso',
            severidad: 'aviso',
            objetivo,
            referencia: calculo.proyecto.grado.ref,
            mensaje: `La norma cargada no tiene puntos mínimos para el uso de "${a.nombre}", así que no se verifican.`,
            datos: { uso: a.uso },
          }),
        )
        continue
      }

      const { valor: req, ref: referencia } = pmu.requerido

      if (req.faltaLargo) {
        salida.push(
          advertir('R07', {
            variante: 'largo',
            severidad: 'aviso',
            objetivo,
            referencia,
            mensaje: `Falta el largo de "${a.nombre}": sus puntos mínimos se calculan por metro lineal.`,
            sugerencia: 'Cargá el largo en la pestaña Ambientes.',
          }),
        )
      }

      for (const nota of req.notas) {
        salida.push(advertir('R07', { variante: 'nota', severidad: 'info', objetivo, referencia, mensaje: `${a.nombre}: ${nota}` }))
      }

      for (const [tipo, minimo] of Object.entries(req.porTipo)) {
        const tiene = pmu.actual[tipo] ?? 0
        if (tiene < minimo) {
          salida.push(
            advertir('R07', {
              variante: tipo,
              severidad: 'error',
              objetivo,
              referencia,
              mensaje: `A "${a.nombre}" le ${minimo - tiene === 1 ? 'falta' : 'faltan'} ${plural(minimo - tiene, 'boca', 'bocas')} de ${tipo}: tiene ${tiene} y el mínimo es ${minimo}.`,
              datos: { tipo, tiene, minimo },
            }),
          )
        }

        // Los módulos para artefactos fijos se suman a las bocas y pueden compartir caja con ellas.
        const esDeTomas = norma.tipoCircuito(tipo)?.valor.clase === 'tomacorriente'
        if (!esDeTomas || req.modulosFijos === 0) continue
        const modulosMinimos = minimo + req.modulosFijos
        const modulos = pmu.modulos[tipo] ?? 0
        if (modulos < modulosMinimos) {
          salida.push(
            advertir('R07', {
              variante: `${tipo}-modulos`,
              severidad: 'error',
              objetivo,
              referencia,
              mensaje: `A "${a.nombre}" le faltan ${plural(modulosMinimos - modulos, 'módulo', 'módulos')} de tomacorriente: tiene ${modulos} y necesita ${modulosMinimos} (${plural(minimo, 'boca', 'bocas')} más ${plural(req.modulosFijos, 'módulo', 'módulos')} para artefactos de ubicación fija, que pueden compartir caja).`,
              datos: { tipo, modulos, modulosMinimos },
            }),
          )
        }
      }
    }
    return salida
  },
}
