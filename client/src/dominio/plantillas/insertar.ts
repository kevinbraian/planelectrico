import { esBoca, esMando } from '../modelo/consultas'
import { ETIQUETA_MANDO } from '../modelo/etiquetas'
import { nuevaBoca, nuevoId, nuevoMando } from '../modelo/fabrica'
import { borrarElemento } from '../modelo/operaciones'
import type { Boca, GrupoPlantilla, Id, Mando, Proyecto } from '../modelo/tipos'
import type { Normativa } from '../normas/contrato'
import type { FuncionRed, PlantillaCircuito } from './tipos'
import { leerPunta, validarPlantilla } from './validar'

export interface OpcionesDeInsercion {
  /** Ranura de la plantilla → circuito del proyecto. */
  circuitos: Record<string, Id>
  /** Lo que no se indique toma el valor por defecto del parámetro. */
  parametros?: Record<string, number>
  /** Ambiente de los elementos que se creen. */
  ambienteId?: Id | null
  /**
   * Combinar: en vez de crear los elementos de un rol, usar estos que ya
   * existen (sumarle un sensor a un punto de luz que ya está cargado).
   */
  enlazar?: Record<string, Id[]>
}

export type ResultadoDeInsercion = { ok: true; grupo: GrupoPlantilla } | { ok: false; errores: string[] }

/** Cantidad de elementos de cada rol, con los parámetros ya resueltos. */
export function cantidadesPorRol(plantilla: PlantillaCircuito, parametros: Record<string, number> = {}): Record<string, number> {
  const valor = (id: string) => parametros[id] ?? plantilla.parametros.find((x) => x.id === id)?.porDefecto ?? 1
  return Object.fromEntries(plantilla.roles.map((r) => [r.id, typeof r.cantidad === 'number' ? r.cantidad : valor(r.cantidad.parametro)]))
}

/**
 * Conductores que implica la plantilla, por función. Cada red es un conductor;
 * un rol en serie agrega los suyos por cada instancia adicional.
 */
export function conductoresPorFuncion(plantilla: PlantillaCircuito, parametros: Record<string, number> = {}): Partial<Record<FuncionRed, number>> {
  const cuenta: Partial<Record<FuncionRed, number>> = {}
  const sumar = (funcion: FuncionRed, n: number) => {
    cuenta[funcion] = (cuenta[funcion] ?? 0) + n
  }
  for (const red of plantilla.redes) sumar(red.funcion, 1)
  const cantidades = cantidadesPorRol(plantilla, parametros)
  for (const rol of plantilla.roles) {
    if (rol.serie) sumar(rol.serie.funcion, rol.serie.pares.length * Math.max(0, (cantidades[rol.id] ?? 1) - 1))
  }
  return cuenta
}

/** Las redes por las que viaja la orden de un mando hasta la carga. */
const DE_COMANDO: FuncionRed[] = ['retorno', 'viajero', 'mando']

/**
 * Qué roles de boca maneja cada rol de mando: los que quedan unidos a él por
 * retornos, viajeros o líneas de mando, pasando por otros mandos.
 */
function bocasComandadasPorRol(plantilla: PlantillaCircuito): Record<string, string[]> {
  const vecinos = new Map<string, Set<string>>()
  for (const red of plantilla.redes) {
    if (!DE_COMANDO.includes(red.funcion)) continue
    const roles = red.une.flatMap((punta) => {
      const leida = leerPunta(punta)
      return leida && 'rol' in leida ? [leida.rol] : []
    })
    for (const a of roles) {
      for (const b of roles) {
        if (a === b) continue
        if (!vecinos.has(a)) vecinos.set(a, new Set())
        vecinos.get(a)!.add(b)
      }
    }
  }

  const esBocaElRol = new Map(plantilla.roles.map((r) => [r.id, r.elemento.clase === 'boca']))
  const salida: Record<string, string[]> = {}
  for (const rol of plantilla.roles) {
    if (rol.elemento.clase !== 'mando') continue
    const visitados = new Set([rol.id])
    const pendientes = [rol.id]
    while (pendientes.length > 0) {
      for (const vecino of vecinos.get(pendientes.pop()!) ?? []) {
        if (visitados.has(vecino)) continue
        visitados.add(vecino)
        // La orden pasa por otros mandos, pero termina en la boca.
        if (!esBocaElRol.get(vecino)) pendientes.push(vecino)
      }
    }
    salida[rol.id] = [...visitados].filter((id) => esBocaElRol.get(id))
  }
  return salida
}

/**
 * Inserta una plantilla en el proyecto que recibe (lo modifica). Primero
 * valida todo: si devuelve errores, el proyecto queda como estaba.
 */
export function insertarEn(p: Proyecto, norma: Normativa, plantilla: PlantillaCircuito, opciones: OpcionesDeInsercion): ResultadoDeInsercion {
  const errores = validarPlantilla(plantilla)

  for (const ranura of plantilla.ranuras) {
    const circuito = p.circuitos[opciones.circuitos[ranura.id] ?? '']
    const nombre = ranura.etiqueta ?? ranura.id
    if (!circuito) errores.push(`Falta elegir el circuito para "${nombre}".`)
    else if (!ranura.tiposAdmitidos.includes(circuito.tipo)) {
      errores.push(`"${nombre}" necesita un circuito ${ranura.tiposAdmitidos.join(' o ')} y "${circuito.nombre}" es ${circuito.tipo}.`)
    }
  }

  const parametros: Record<string, number> = {}
  for (const x of plantilla.parametros) {
    const valor = opciones.parametros?.[x.id] ?? x.porDefecto
    if (!Number.isInteger(valor) || valor < x.min || valor > x.max) errores.push(`"${x.etiqueta}" tiene que estar entre ${x.min} y ${x.max}.`)
    parametros[x.id] = valor
  }

  for (const [rolId, ids] of Object.entries(opciones.enlazar ?? {})) {
    const rol = plantilla.roles.find((r) => r.id === rolId)
    if (!rol) {
      errores.push(`La plantilla no tiene el rol "${rolId}".`)
      continue
    }
    for (const id of ids) {
      const e = p.elementos[id]
      const coincide = e && e.clase === rol.elemento.clase && (esBoca(e) || esMando(e)) && e.circuitoId === opciones.circuitos[rol.ranura]
      if (!coincide) errores.push(`No se puede usar el elemento elegido como "${rol.etiqueta}": tiene que ser del mismo tipo y del mismo circuito.`)
    }
  }
  if (errores.length > 0) return { ok: false, errores }

  const grupoId = nuevoId()
  const cantidades = cantidadesPorRol(plantilla, parametros)
  const roles: Record<string, Id[]> = {}

  for (const rol of plantilla.roles) {
    const enlazados = opciones.enlazar?.[rol.id]
    if (enlazados && enlazados.length > 0) {
      roles[rol.id] = [...enlazados]
      continue
    }
    const circuito = p.circuitos[opciones.circuitos[rol.ranura]!]!
    const ambienteId = opciones.ambienteId ?? null
    roles[rol.id] = []
    for (let i = 0; i < (cantidades[rol.id] ?? 1); i++) {
      let elemento: Boca | Mando
      if (rol.elemento.clase === 'boca') {
        elemento = nuevaBoca(p, norma, circuito, rol.elemento.uso, ambienteId)
        if (rol.elemento.tomas) elemento.tomas = { ...rol.elemento.tomas }
        if (rol.elemento.caja) elemento.caja = rol.elemento.caja
      } else {
        elemento = nuevoMando(p, circuito.id, rol.elemento.tipo, ambienteId)
        // "Conmutador A" y "Conmutador B" se distinguen por el nombre del rol.
        if (rol.etiqueta !== ETIQUETA_MANDO[rol.elemento.tipo]) elemento.nombre = rol.etiqueta
      }
      elemento.grupoId = grupoId
      elemento.rol = rol.id
      p.elementos[elemento.id] = elemento
      roles[rol.id]!.push(elemento.id)
    }
  }

  for (const [rolDeMando, rolesDeBoca] of Object.entries(bocasComandadasPorRol(plantilla))) {
    const bocas = rolesDeBoca.flatMap((rolId) => roles[rolId] ?? [])
    for (const mandoId of roles[rolDeMando] ?? []) {
      const mando = p.elementos[mandoId]
      if (mando && esMando(mando)) mando.comanda = [...new Set([...mando.comanda, ...bocas])]
    }
  }

  const grupo: GrupoPlantilla = {
    id: grupoId,
    plantillaId: plantilla.id,
    plantillaVersion: plantilla.version,
    nombre: plantilla.nombre,
    parametros,
    circuitos: Object.fromEntries(plantilla.ranuras.map((r) => [r.id, opciones.circuitos[r.id]!])),
    roles,
  }
  p.grupos[grupoId] = grupo
  return { ok: true, grupo }
}

/** Versión pura: devuelve un proyecto nuevo y deja intacto el que recibe. */
export function insertar(
  proyecto: Proyecto,
  norma: Normativa,
  plantilla: PlantillaCircuito,
  opciones: OpcionesDeInsercion,
): { ok: true; proyecto: Proyecto; grupo: GrupoPlantilla } | { ok: false; errores: string[] } {
  const copia = structuredClone(proyecto)
  const resultado = insertarEn(copia, norma, plantilla, opciones)
  return resultado.ok ? { ok: true, proyecto: copia, grupo: resultado.grupo } : resultado
}

/**
 * Quita un grupo. Borra los elementos que creó la plantilla; los que se
 * enlazaron (ya existían antes) se quedan.
 */
export function quitarGrupo(p: Proyecto, grupoId: Id): void {
  if (!p.grupos[grupoId]) return
  const creados = Object.values(p.elementos).filter((e) => e.grupoId === grupoId)
  for (const e of creados) borrarElemento(p, e.id)
  delete p.grupos[grupoId]
}

/** Guarda una copia de la plantilla de un grupo, con sus parámetros actuales como valores por defecto. */
export function guardarComoPropia(p: Proyecto, plantilla: PlantillaCircuito, grupo: GrupoPlantilla, nombre: string): PlantillaCircuito {
  const propia: PlantillaCircuito = {
    ...structuredClone(plantilla),
    id: `propia-${nuevoId()}`,
    version: 1,
    origen: 'usuario',
    nombre,
    parametros: plantilla.parametros.map((x) => {
      const actual = grupo.parametros[x.id]
      return { ...x, porDefecto: typeof actual === 'number' ? actual : x.porDefecto }
    }),
  }
  p.plantillasPropias[propia.id] = propia
  return propia
}
