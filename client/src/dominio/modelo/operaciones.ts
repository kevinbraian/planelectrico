import { descendientesDe, esBoca, esMando } from './consultas'
import type { Id, Proyecto } from './tipos'

/**
 * Cambios que tocan más de una colección. Modifican el proyecto que reciben:
 * están pensadas para usarse dentro de immer (el store) o sobre una copia.
 */

/** Borra un elemento, lo que cuelga de él y las referencias que lo apuntan. */
export function borrarElemento(p: Proyecto, id: Id): void {
  if (!p.elementos[id]) return
  const aBorrar = new Set<Id>([id, ...descendientesDe(p, id).map((e) => e.id)])
  for (const borrado of aBorrar) delete p.elementos[borrado]

  for (const e of Object.values(p.elementos)) {
    if (esMando(e)) e.comanda = e.comanda.filter((bocaId) => !aBorrar.has(bocaId))
  }
  for (const [grupoId, grupo] of Object.entries(p.grupos)) {
    for (const rol of Object.keys(grupo.roles)) {
      grupo.roles[rol] = (grupo.roles[rol] ?? []).filter((elementoId) => !aBorrar.has(elementoId))
    }
    if (Object.values(grupo.roles).every((ids) => ids.length === 0)) delete p.grupos[grupoId]
  }
}

export function borrarCircuito(p: Proyecto, id: Id): void {
  if (!p.circuitos[id]) return
  const propios = Object.values(p.elementos).filter((e) => (esBoca(e) || esMando(e)) && e.circuitoId === id)
  for (const e of propios) borrarElemento(p, e.id)
  delete p.circuitos[id]
}

/** Los elementos del ambiente borrado quedan sin ambiente; no se pierden. */
export function borrarAmbiente(p: Proyecto, id: Id): void {
  if (!p.ambientes[id]) return
  delete p.ambientes[id]
  for (const e of Object.values(p.elementos)) {
    if (e.ambienteId === id) e.ambienteId = null
  }
  for (const t of Object.values(p.tableros)) {
    if (t.ambienteId === id) delete t.ambienteId
  }
}

export function borrarDiferencial(p: Proyecto, tableroId: Id, diferencialId: Id): void {
  const tablero = p.tableros[tableroId]
  if (!tablero) return
  tablero.diferenciales = tablero.diferenciales.filter((d) => d.id !== diferencialId)
  for (const c of Object.values(p.circuitos)) {
    if (c.proteccion.diferencialId === diferencialId) delete c.proteccion.diferencialId
  }
}
