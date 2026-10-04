import { nanoid } from 'nanoid'
import type { Normativa } from '../normas/contrato'
import { siguienteOrden } from './consultas'
import {
  ESQUEMA_ACTUAL,
  type Ambiente,
  type Boca,
  type Carga,
  type Circuito,
  type Contenedor,
  type Diferencial,
  type Id,
  type Mando,
  type Proyecto,
  type TipoCarga,
  type TipoContenedor,
  type TipoMando,
  type UsoBoca,
} from './tipos'

/**
 * Valores iniciales de cada entidad. Lo que depende de la norma (sección
 * mínima, calibre, corriente de los tomas) se le pregunta a la norma; el
 * resto son puntos de partida que el usuario edita.
 */

export const nuevoId = (): Id => nanoid(10)

export function crearProyecto(opciones: { norma: Normativa; nombre?: string; modo?: Proyecto['modo']; ahora?: Date }): Proyecto {
  const ahora = (opciones.ahora ?? new Date()).toISOString()
  const plantaId = nuevoId()
  const tableroId = nuevoId()
  return {
    esquema: ESQUEMA_ACTUAL,
    id: nuevoId(),
    nombre: opciones.nombre ?? 'Mi casa',
    creadoEn: ahora,
    modificadoEn: ahora,
    modo: opciones.modo ?? 'relevamiento',
    norma: { id: opciones.norma.id, edicion: opciones.norma.edicion },
    suministro: { sistema: 'monofasico' },
    opciones: { aplicarSimultaneidad: true, fpPorDefecto: 1 },
    plantas: { [plantaId]: { id: plantaId, nombre: 'Planta baja', orden: 1 } },
    ambientes: {},
    tableros: {
      [tableroId]: { id: tableroId, nombre: 'Tablero principal', tipo: 'principal', orden: 1, diferenciales: [] },
    },
    circuitos: {},
    elementos: {},
    grupos: {},
    plantillasPropias: {},
    catalogoPropio: {},
  }
}

/** "Dormitorio", "Dormitorio 2"… según cuántos haya con el mismo uso. */
export function nuevoAmbiente(p: Proyecto, norma: Normativa, uso: string): Ambiente {
  const def = norma.usosDeAmbiente().find((u) => u.id === uso)
  const base = def?.nombreCorto ?? 'Ambiente'
  const repetidos = Object.values(p.ambientes).filter((a) => a.uso === uso).length
  const plantaId = Object.values(p.plantas).sort((a, b) => a.orden - b.orden)[0]?.id ?? ''
  return {
    id: nuevoId(),
    plantaId,
    nombre: repetidos === 0 ? base : `${base} ${repetidos + 1}`,
    orden: siguienteOrden(Object.values(p.ambientes)),
    uso,
    superficieM2: 0,
    cerramiento: def?.cerramientoPorDefecto ?? 'cubierto',
  }
}

/**
 * Arranca con la sección mínima del tipo y la térmica comercial más grande
 * que esa sección admite, para que un circuito recién creado no nazca en falta.
 */
export function nuevoCircuito(p: Proyecto, norma: Normativa, tipo: string, tableroId?: Id): Circuito {
  const def = norma.tipoCircuito(tipo)?.valor
  const metodo = norma.metodosInstalacion()[0]?.id ?? ''
  const calibres = norma.calibresComerciales()
  const seccionMm2 = norma.seccionMinimaMm2({ tipo, tieneTomasDerivadas: false })?.valor ?? norma.seccionesMm2(metodo)[0]
  if (seccionMm2 === undefined || calibres.length === 0) {
    throw new Error(`La norma ${norma.nombre} no trae secciones o calibres para armar un circuito.`)
  }
  const iz = norma.corrienteAdmisibleA({ seccionMm2, metodo, cargados: 2, circuitosEnLaCaneria: 1 })
  const tope = Math.min(def?.maxProteccionA ?? Infinity, iz.ok ? iz.valor : Infinity)
  const inA = calibres.filter((c) => c <= tope).at(-1) ?? Math.min(...calibres)

  const tablero = tableroId ?? Object.values(p.tableros).sort((a, b) => a.orden - b.orden)[0]?.id ?? ''
  const delMismoTipo = Object.values(p.circuitos).filter((c) => c.tipo === tipo).length
  return {
    id: nuevoId(),
    tableroId: tablero,
    orden: siguienteOrden(Object.values(p.circuitos)),
    nombre: `${tipo} ${delMismoTipo + 1}`,
    tipo,
    proteccion: { inA, polos: 2 },
    conductor: { seccionMm2, metodo, circuitosEnLaCaneria: 1 },
  }
}

export function nuevaBoca(p: Proyecto, norma: Normativa, circuito: Circuito, uso: UsoBoca, ambienteId: Id | null): Boca {
  const boca: Boca = {
    id: nuevoId(),
    orden: siguienteOrden(Object.values(p.elementos)),
    ambienteId,
    clase: 'boca',
    circuitoId: circuito.id,
    uso,
  }
  if (uso === 'tomacorriente' || uso === 'mixta') {
    const corrienteA = norma.tipoCircuito(circuito.tipo)?.valor.cargaUnitariaMaxA ?? circuito.proteccion.inA
    boca.tomas = { cantidad: 1, corrienteA }
    boca.caja = 'rectangular'
  }
  return boca
}

export function nuevoMando(p: Proyecto, circuitoId: Id, tipo: TipoMando, ambienteId: Id | null): Mando {
  return {
    id: nuevoId(),
    orden: siguienteOrden(Object.values(p.elementos)),
    ambienteId,
    clase: 'mando',
    circuitoId,
    tipo,
    comanda: [],
  }
}

export function nuevaCarga(p: Proyecto, conectadaA: Id, tipo: TipoCarga): Carga {
  return {
    id: nuevoId(),
    orden: siguienteOrden(Object.values(p.elementos)),
    ambienteId: null,
    clase: 'carga',
    tipo,
    conectadaA,
    potencia: { valor: 0, unidad: 'W' },
    cantidad: 1,
  }
}

/**
 * Puntos de partida tomados de los productos más comunes, no de la norma. El
 * usuario los reemplaza por lo que dice el aparato que tiene instalado.
 */
const CAPACIDAD_HABITUAL_DE_REGLETA_A = 10
const CORRIENTE_HABITUAL_DE_DIFERENCIAL_A = 40

export function nuevoContenedor(p: Proyecto, conectadaA: Id, tipo: TipoContenedor): Contenedor {
  return {
    id: nuevoId(),
    orden: siguienteOrden(Object.values(p.elementos)),
    ambienteId: null,
    clase: 'contenedor',
    tipo,
    conectadaA,
    capacidadMax: { corrienteA: CAPACIDAD_HABITUAL_DE_REGLETA_A },
  }
}

export function nuevoDiferencial(norma: Normativa): Diferencial {
  return {
    id: nuevoId(),
    inA: CORRIENTE_HABITUAL_DE_DIFERENCIAL_A,
    sensibilidadMa: norma.sensibilidadDiferencialMaxMa().valor,
    polos: 2,
  }
}
