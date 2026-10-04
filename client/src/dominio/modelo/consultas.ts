import type { Boca, Carga, Circuito, Contenedor, Elemento, Id, Mando, Proyecto } from './tipos'

/** Lecturas sobre un proyecto. Ninguna lo modifica. */

export function ordenar<T extends { orden: number }>(items: Iterable<T>): T[] {
  return [...items].sort((a, b) => a.orden - b.orden)
}

export function siguienteOrden(items: Iterable<{ orden: number }>): number {
  let max = 0
  for (const i of items) max = Math.max(max, i.orden)
  return max + 1
}

export const esBoca = (e: Elemento): e is Boca => e.clase === 'boca'
export const esMando = (e: Elemento): e is Mando => e.clase === 'mando'
export const esCarga = (e: Elemento): e is Carga => e.clase === 'carga'
export const esContenedor = (e: Elemento): e is Contenedor => e.clase === 'contenedor'

/** Circuitos en el orden del tablero: primero por tablero, después por su orden. */
export function circuitosOrdenados(p: Proyecto): Circuito[] {
  const ordenTablero = (c: Circuito) => p.tableros[c.tableroId]?.orden ?? 0
  return Object.values(p.circuitos).sort((a, b) => ordenTablero(a) - ordenTablero(b) || a.orden - b.orden)
}

/** "C1", "C2"… según la posición del circuito en el tablero. */
export function codigoCircuito(p: Proyecto, circuitoId: Id): string {
  const i = circuitosOrdenados(p).findIndex((c) => c.id === circuitoId)
  return i < 0 ? 'C?' : `C${i + 1}`
}

export function bocasDe(p: Proyecto, circuitoId: Id): Boca[] {
  return ordenar(Object.values(p.elementos).filter((e): e is Boca => esBoca(e) && e.circuitoId === circuitoId))
}

export function mandosDe(p: Proyecto, circuitoId: Id): Mando[] {
  return ordenar(Object.values(p.elementos).filter((e): e is Mando => esMando(e) && e.circuitoId === circuitoId))
}

/** Cargas y contenedores conectados directamente a una boca o a un contenedor. */
export function hijosDe(p: Proyecto, id: Id): (Carga | Contenedor)[] {
  return ordenar(
    Object.values(p.elementos).filter(
      (e): e is Carga | Contenedor => (esCarga(e) || esContenedor(e)) && e.conectadaA === id,
    ),
  )
}

/** Todo lo que cuelga de un elemento, a cualquier profundidad. */
export function descendientesDe(p: Proyecto, id: Id): (Carga | Contenedor)[] {
  const salida: (Carga | Contenedor)[] = []
  const visitados = new Set<Id>([id])
  const pendientes = [id]
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!
    for (const hijo of hijosDe(p, actual)) {
      if (visitados.has(hijo.id)) continue
      visitados.add(hijo.id)
      salida.push(hijo)
      pendientes.push(hijo.id)
    }
  }
  return salida
}

/** La boca de la que cuelga una carga o un contenedor, subiendo por `conectadaA`. */
export function bocaDe(p: Proyecto, e: Elemento): Boca | undefined {
  let actual: Elemento | undefined = e
  const visitados = new Set<Id>()
  while (actual && !visitados.has(actual.id)) {
    if (esBoca(actual)) return actual
    if (esMando(actual)) return undefined
    visitados.add(actual.id)
    actual = p.elementos[actual.conectadaA]
  }
  return undefined
}

export function circuitoDe(p: Proyecto, e: Elemento): Id | undefined {
  if (esBoca(e) || esMando(e)) return e.circuitoId
  return bocaDe(p, e)?.circuitoId
}

/** Nombre para mostrar de un elemento que quizá no tenga uno propio. */
export function ambienteDe(p: Proyecto, e: Elemento): Id | null {
  if (e.ambienteId) return e.ambienteId
  return esCarga(e) || esContenedor(e) ? (bocaDe(p, e)?.ambienteId ?? null) : null
}
