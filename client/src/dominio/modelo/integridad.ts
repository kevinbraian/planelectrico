import { bocaDe, esBoca, esCarga, esContenedor, esMando } from './consultas'
import type { Proyecto } from './tipos'

/**
 * Referencias entre colecciones que el esquema zod no puede comprobar.
 * Devuelve los problemas encontrados; lista vacía si el proyecto es coherente.
 */
export function verificarIntegridad(p: Proyecto): string[] {
  const problemas: string[] = []

  for (const a of Object.values(p.ambientes)) {
    if (!p.plantas[a.plantaId]) problemas.push(`El ambiente "${a.nombre}" apunta a una planta inexistente.`)
  }

  for (const t of Object.values(p.tableros)) {
    if (t.alimentadoDesdeTableroId && !p.tableros[t.alimentadoDesdeTableroId]) {
      problemas.push(`El tablero "${t.nombre}" se alimenta de un tablero inexistente.`)
    }
  }

  for (const c of Object.values(p.circuitos)) {
    const tablero = p.tableros[c.tableroId]
    if (!tablero) {
      problemas.push(`El circuito "${c.nombre}" apunta a un tablero inexistente.`)
    } else if (c.proteccion.diferencialId && !tablero.diferenciales.some((d) => d.id === c.proteccion.diferencialId)) {
      problemas.push(`El circuito "${c.nombre}" apunta a un diferencial que no está en su tablero.`)
    }
  }

  for (const [clave, e] of Object.entries(p.elementos)) {
    const nombre = e.nombre ?? e.id
    if (clave !== e.id) problemas.push(`El elemento "${nombre}" está guardado bajo otra clave.`)
    if (e.ambienteId && !p.ambientes[e.ambienteId]) problemas.push(`El elemento "${nombre}" apunta a un ambiente inexistente.`)
    if ((esBoca(e) || esMando(e)) && !p.circuitos[e.circuitoId]) {
      problemas.push(`El elemento "${nombre}" apunta a un circuito inexistente.`)
    }
    if (esMando(e)) {
      for (const bocaId of e.comanda) {
        const boca = p.elementos[bocaId]
        if (!boca || !esBoca(boca)) problemas.push(`El mando "${nombre}" comanda una boca inexistente.`)
      }
    }
    if (esCarga(e) || esContenedor(e)) {
      const destino = p.elementos[e.conectadaA]
      if (!destino || !(esBoca(destino) || esContenedor(destino))) {
        problemas.push(`"${nombre}" no está conectado a una boca ni a una regleta.`)
      } else if (!bocaDe(p, e)) {
        problemas.push(`"${nombre}" está conectado en círculo y no llega a ninguna boca.`)
      }
    }
  }

  return problemas
}
