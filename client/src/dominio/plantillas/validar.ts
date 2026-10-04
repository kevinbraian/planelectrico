import type { PlantillaCircuito } from './tipos'

const BORNES_DE_CIRCUITO = ['L', 'N', 'PE']

/** Punta de una red: "@ranura.L" es un conductor del circuito; "rol.borne", un borne de un elemento. */
export function leerPunta(punta: string): { ranura: string; borne: string } | { rol: string; borne: string } | undefined {
  const corte = punta.lastIndexOf('.')
  if (corte <= 0 || corte === punta.length - 1) return undefined
  const quien = punta.slice(0, corte)
  const borne = punta.slice(corte + 1)
  return quien.startsWith('@') ? { ranura: quien.slice(1), borne } : { rol: quien, borne }
}

/**
 * Coherencia interna de una plantilla, más allá de su forma: que cada
 * referencia apunte a algo que existe. Devuelve los problemas encontrados.
 */
export function validarPlantilla(p: PlantillaCircuito): string[] {
  const problemas: string[] = []
  const ranuras = new Set(p.ranuras.map((r) => r.id))
  const parametros = new Map(p.parametros.map((x) => [x.id, x]))
  const roles = new Map(p.roles.map((r) => [r.id, r]))

  const repetidos = (nombre: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) problemas.push(`Hay ${nombre} con el mismo id.`)
  }
  repetidos('ranuras', p.ranuras.map((r) => r.id))
  repetidos('parámetros', p.parametros.map((x) => x.id))
  repetidos('roles', p.roles.map((r) => r.id))
  repetidos('redes', p.redes.map((r) => r.id))

  if (p.ranuras.length === 0) problemas.push('La plantilla no toca ningún circuito.')
  if (p.roles.length === 0) problemas.push('La plantilla no crea ningún elemento.')

  for (const x of p.parametros) {
    if (x.min < 1 || x.max < x.min || x.porDefecto < x.min || x.porDefecto > x.max) {
      problemas.push(`El parámetro "${x.id}" tiene un rango inválido.`)
    }
  }

  const conectados = new Set<string>()
  for (const red of p.redes) {
    for (const punta of red.une) {
      const leida = leerPunta(punta)
      if (!leida) {
        problemas.push(`La red "${red.id}" tiene una punta mal escrita: "${punta}".`)
      } else if ('ranura' in leida) {
        if (!ranuras.has(leida.ranura)) problemas.push(`La red "${red.id}" nombra la ranura "${leida.ranura}", que no existe.`)
        if (!BORNES_DE_CIRCUITO.includes(leida.borne)) problemas.push(`La red "${red.id}" pide "${leida.borne}" a un circuito, que solo da L, N y PE.`)
      } else {
        const rol = roles.get(leida.rol)
        if (!rol) problemas.push(`La red "${red.id}" nombra el rol "${leida.rol}", que no existe.`)
        else if (!rol.bornes.includes(leida.borne)) problemas.push(`La red "${red.id}" usa el borne "${leida.borne}", que "${rol.id}" no tiene.`)
        else conectados.add(`${rol.id}.${leida.borne}`)
      }
    }
  }

  for (const rol of p.roles) {
    if (!ranuras.has(rol.ranura)) problemas.push(`El rol "${rol.id}" va a la ranura "${rol.ranura}", que no existe.`)
    if (typeof rol.cantidad !== 'number' && !parametros.has(rol.cantidad.parametro)) {
      problemas.push(`El rol "${rol.id}" toma su cantidad del parámetro "${rol.cantidad.parametro}", que no existe.`)
    }
    for (const borne of rol.bornes) {
      if (!conectados.has(`${rol.id}.${borne}`)) problemas.push(`El borne "${borne}" de "${rol.id}" no está conectado a nada.`)
    }
    for (const par of rol.serie?.pares ?? []) {
      if (!par.every((borne) => rol.bornes.includes(borne))) problemas.push(`La serie de "${rol.id}" nombra un borne que no tiene.`)
    }
  }

  return problemas
}
