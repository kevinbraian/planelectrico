import { crearProyecto, nuevaBoca, nuevaCarga, nuevoAmbiente, nuevoCircuito, nuevoContenedor, nuevoMando } from '../modelo/fabrica'
import type { Ambiente, Boca, Capacidad, Carga, Id, Mando, Potencia, Proyecto, TipoMando, UsoBoca } from '../modelo/tipos'
import { aea770 } from '../normas/aea-770-2017'
import { analizar } from '../reglas/motor'
import type { Advertencia } from '../reglas/tipos'

/**
 * Arma proyectos chicos para los tests, con ids legibles (amb1, cir2, ele3…).
 * Solo se usa desde archivos .test.ts.
 */
export function construir() {
  const p: Proyecto = crearProyecto({ norma: aea770, nombre: 'Prueba', ahora: new Date('2026-01-01T00:00:00Z') })
  let contador = 0
  const id = (prefijo: string): Id => `${prefijo}${++contador}`

  const api = {
    p,

    ambiente(uso: string, superficieM2: number, extra: Partial<Ambiente> = {}): Id {
      const a = { ...nuevoAmbiente(p, aea770, uso), id: id('amb'), superficieM2, ...extra }
      p.ambientes[a.id] = a
      return a.id
    },

    circuito(tipo: string, extra: { inA?: number; seccionMm2?: number; enLaCaneria?: number; polos?: 2 | 4; demandaManualVA?: number; diferencialId?: Id } = {}): Id {
      const c = { ...nuevoCircuito(p, aea770, tipo), id: id('cir') }
      if (extra.inA !== undefined) c.proteccion.inA = extra.inA
      if (extra.polos !== undefined) c.proteccion.polos = extra.polos
      if (extra.diferencialId !== undefined) c.proteccion.diferencialId = extra.diferencialId
      if (extra.seccionMm2 !== undefined) c.conductor.seccionMm2 = extra.seccionMm2
      if (extra.enLaCaneria !== undefined) c.conductor.circuitosEnLaCaneria = extra.enLaCaneria
      if (extra.demandaManualVA !== undefined) c.demandaManualVA = extra.demandaManualVA
      p.circuitos[c.id] = c
      return c.id
    },

    boca(circuitoId: Id, uso: UsoBoca, ambienteId: Id | null = null, extra: Partial<Boca> = {}): Id {
      const b = { ...nuevaBoca(p, aea770, p.circuitos[circuitoId]!, uso, ambienteId), id: id('ele'), ...extra }
      p.elementos[b.id] = b
      return b.id
    },

    bocas(circuitoId: Id, uso: UsoBoca, cantidad: number, ambienteId: Id | null = null): Id[] {
      return Array.from({ length: cantidad }, () => api.boca(circuitoId, uso, ambienteId))
    },

    mando(circuitoId: Id, tipo: TipoMando, comanda: Id[] = [], extra: Partial<Mando> = {}): Id {
      const m = { ...nuevoMando(p, circuitoId, tipo, null), id: id('ele'), comanda, ...extra }
      p.elementos[m.id] = m
      return m.id
    },

    carga(conectadaA: Id, potencia: Potencia, extra: Partial<Carga> = {}): Id {
      const c = { ...nuevaCarga(p, conectadaA, 'artefacto'), id: id('ele'), potencia, ...extra }
      p.elementos[c.id] = c
      return c.id
    },

    regleta(conectadaA: Id, capacidadMax: Capacidad = { corrienteA: 10 }): Id {
      const r = { ...nuevoContenedor(p, conectadaA, 'regleta'), id: id('ele'), capacidadMax }
      p.elementos[r.id] = r
      return r.id
    },

    analizar: () => analizar(p, aea770),

    /** Advertencias de una regla, opcionalmente solo las de un objetivo. */
    advertencias(reglaId: string, objetivoId?: Id): Advertencia[] {
      return api
        .analizar()
        .advertencias.filter((a) => a.reglaId === reglaId && (objetivoId === undefined || a.objetivo.id === objetivoId))
    },
  }
  return api
}

export const VA = (valor: number): Potencia => ({ valor, unidad: 'VA' })
export const W = (valor: number, fp?: number): Potencia => ({ valor, unidad: 'W', fp })
