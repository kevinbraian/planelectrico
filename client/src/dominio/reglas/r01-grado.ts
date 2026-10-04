import { formatear } from '../util/numeros'
import { advertir, type Regla } from './tipos'

/** Grado de electrificación según la superficie computable. */
export const r01Grado: Regla = {
  id: 'R01',
  titulo: 'Grado de electrificación',
  evaluar({ proyecto, norma, calculo }) {
    const objetivo = { tipo: 'proyecto', id: proyecto.id } as const
    const { superficie, grado } = calculo.proyecto

    if (!grado) {
      return [
        advertir('R01', {
          variante: 'sin-superficie',
          severidad: 'aviso',
          objetivo,
          referencia: norma.superficieComputable({ cubiertaM2: 0, semicubiertaM2: 0 }).ref,
          mensaje:
            'Todavía no hay superficie cargada. Sin ella no se puede determinar el grado de electrificación, ni los circuitos y puntos mínimos que dependen de él.',
          sugerencia: 'Cargá los ambientes con sus m².',
        }),
      ]
    }

    return [
      advertir('R01', {
        severidad: 'info',
        objetivo,
        referencia: grado.ref,
        mensaje: `Grado de electrificación ${grado.valor.nombre}: ${formatear(superficie.valor)} m² computables (${grado.detalle}).`,
        datos: { superficieM2: superficie.valor, grado: grado.valor.id },
      }),
    ]
  },
}
