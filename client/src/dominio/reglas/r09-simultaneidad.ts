import { formatear } from '../util/numeros'
import { advertir, type Regla } from './tipos'

/** Coeficiente de simultaneidad del grado. Es optativo: se informa si se aplicó o no. */
export const r09Simultaneidad: Regla = {
  id: 'R09',
  titulo: 'Coeficiente de simultaneidad',
  evaluar({ proyecto, calculo }) {
    const { coeficiente, dpmsGeneralSinCoeficienteVA } = calculo.proyecto
    if (!coeficiente || dpmsGeneralSinCoeficienteVA === 0) return []

    const aplicado = proyecto.opciones.aplicarSimultaneidad
    return [
      advertir('R09', {
        severidad: 'info',
        objetivo: { tipo: 'proyecto', id: proyecto.id },
        referencia: coeficiente.ref,
        mensaje: aplicado
          ? `Se aplicó el coeficiente de simultaneidad ${formatear(coeficiente.valor)} a la demanda de los circuitos de uso general y especial.`
          : `No se aplicó el coeficiente de simultaneidad (${formatear(coeficiente.valor)} para este grado): está desactivado en las opciones del proyecto.`,
        datos: { coeficiente: coeficiente.valor, aplicado: aplicado ? 'sí' : 'no' },
      }),
    ]
  },
}
