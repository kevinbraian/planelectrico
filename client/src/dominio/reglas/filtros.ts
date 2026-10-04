import { circuitoDe } from '../modelo/consultas'
import type { Id, Proyecto } from '../modelo/tipos'
import type { Advertencia } from './tipos'

/** Las advertencias que hablan de un circuito o de algo conectado a él. */
export function advertenciasDeCircuito(p: Proyecto, advertencias: Advertencia[], circuitoId: Id): Advertencia[] {
  return advertencias.filter(({ objetivo }) => {
    if (objetivo.tipo === 'circuito') return objetivo.id === circuitoId
    if (objetivo.tipo !== 'elemento') return false
    const elemento = p.elementos[objetivo.id]
    return elemento !== undefined && circuitoDe(p, elemento) === circuitoId
  })
}

export function contarPorSeveridad(advertencias: Advertencia[]): { error: number; aviso: number; info: number } {
  const cuenta = { error: 0, aviso: 0, info: 0 }
  for (const a of advertencias) cuenta[a.severidad] += 1
  return cuenta
}
