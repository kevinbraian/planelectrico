import { aVA, capacidadEnA } from '../calculo/potencia'
import { circuitoDe, esBoca, esCarga, esContenedor, esMando, hijosDe } from '../modelo/consultas'
import { describirElemento } from '../modelo/etiquetas'
import type { Referencia } from '../normas/contrato'
import { formatear, redondear } from '../util/numeros'
import { advertir, type Advertencia, type Regla } from './tipos'

const DEL_FABRICANTE: Referencia = {
  origen: 'producto',
  detalle: 'Capacidad indicada por el fabricante en el producto',
}

/**
 * Lo conectado contra lo que aguanta cada cosa: la carga unitaria que admite
 * el tipo de circuito, el tomacorriente, la regleta o el alargue, y el mando.
 * Se compara a potencia plena: una regleta se sobrecarga con todo encendido.
 */
export const r10Capacidad: Regla = {
  id: 'R10',
  titulo: 'Capacidad de tomas, regletas y mandos',
  evaluar({ proyecto: p, calculo }) {
    const salida: Advertencia[] = []
    const fp = p.opciones.fpPorDefecto
    const tensionV = calculo.proyecto.tensionV

    for (const e of Object.values(p.elementos)) {
      const objetivo = { tipo: 'elemento', id: e.id } as const
      const nombre = describirElemento(p, e)

      if (esCarga(e)) {
        const circuitoId = circuitoDe(p, e)
        const tipo = circuitoId ? calculo.circuitos[circuitoId]?.tipo : undefined
        const maximoA = tipo?.valor.cargaUnitariaMaxA
        if (!tipo || maximoA === undefined) continue
        const unidadA = redondear(aVA(e.potencia, fp) / tensionV)
        if (unidadA > maximoA) {
          salida.push(
            advertir('R10', {
              variante: 'unitaria',
              severidad: 'error',
              objetivo,
              referencia: tipo.ref,
              mensaje: `${nombre} consume ${formatear(unidadA)} A y en un circuito ${tipo.valor.id} cada carga puede ser de hasta ${formatear(maximoA)} A.`,
              datos: { corrienteA: unidadA, maximoA },
              sugerencia: 'Una carga así necesita un circuito de otro tipo.',
            }),
          )
        }
      } else if (esContenedor(e)) {
        const totalA = calculo.cargas[e.id]?.a ?? 0
        const capacidadA = redondear(capacidadEnA(e.capacidadMax, tensionV, fp))
        if (totalA > capacidadA) {
          salida.push(
            advertir('R10', {
              variante: 'capacidad',
              severidad: 'error',
              objetivo,
              referencia: DEL_FABRICANTE,
              mensaje: `${nombre} tiene conectados ${formatear(totalA)} A y su capacidad es de ${formatear(capacidadA)} A.`,
              datos: { corrienteA: totalA, capacidadA },
              sugerencia: 'Repartí los aparatos en otros tomacorrientes.',
            }),
          )
        }

        const enchufe = p.elementos[e.conectadaA]
        const tipo = enchufe && esBoca(enchufe) ? calculo.circuitos[enchufe.circuitoId]?.tipo : undefined
        if (enchufe && esBoca(enchufe) && enchufe.tomas && tipo && totalA > enchufe.tomas.corrienteA) {
          salida.push(
            advertir('R10', {
              variante: 'toma',
              severidad: 'error',
              objetivo,
              referencia: tipo.ref,
              mensaje: `${nombre} le pide ${formatear(totalA)} A a un tomacorriente de ${formatear(enchufe.tomas.corrienteA)} A.`,
              datos: { corrienteA: totalA, tomaA: enchufe.tomas.corrienteA },
            }),
          )
        }
      } else if (esBoca(e) && e.tomas) {
        const totalA = calculo.cargas[e.id]?.a ?? 0
        const capacidadA = e.tomas.corrienteA * e.tomas.cantidad
        const tipo = calculo.circuitos[e.circuitoId]?.tipo
        // Si una sola cosa enchufada ya supera al toma, eso se informa sobre ella y no hace falta repetirlo acá.
        const tomaA = e.tomas.corrienteA
        const unoSoloSeExcede = hijosDe(p, e.id).some((h) => (calculo.cargas[h.id]?.a ?? 0) > tomaA)
        if (tipo && totalA > capacidadA && !unoSoloSeExcede) {
          salida.push(
            advertir('R10', {
              variante: 'boca',
              severidad: 'aviso',
              objetivo,
              referencia: tipo.ref,
              mensaje: `${nombre} tiene conectados ${formatear(totalA)} A y sus tomacorrientes suman ${formatear(capacidadA)} A (${e.tomas.cantidad} × ${formatear(e.tomas.corrienteA)} A).`,
              datos: { corrienteA: totalA, capacidadA },
            }),
          )
        }
      } else if (esMando(e) && e.capacidadMax) {
        const totalVA = calculo.cargas[e.id]?.va ?? 0
        const capacidadVA = redondear(aVA(e.capacidadMax, fp))
        if (totalVA > capacidadVA) {
          salida.push(
            advertir('R10', {
              variante: 'mando',
              severidad: 'error',
              objetivo,
              referencia: DEL_FABRICANTE,
              mensaje: `${nombre} maneja ${formatear(totalVA)} VA y admite hasta ${formatear(capacidadVA)} VA.`,
              datos: { cargaVA: totalVA, capacidadVA },
            }),
          )
        }
      }
    }
    return salida
  },
}
