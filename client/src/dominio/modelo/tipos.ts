import type { ArtefactoCatalogo } from '../catalogo/tipos'
import type { PlantillaCircuito } from '../plantillas/tipos'

/**
 * Modelo de una instalación. Colecciones normalizadas por id: los hijos
 * apuntan al padre y guardan su `orden`. Las unidades van en el nombre del
 * campo (`inA`, `seccionMm2`, `superficieM2`).
 */

export type Id = string

export const ESQUEMA_ACTUAL = 1

export interface Proyecto {
  /** Versión del formato de archivo; ver migraciones.ts. */
  esquema: typeof ESQUEMA_ACTUAL
  id: Id
  nombre: string
  creadoEn: string
  modificadoEn: string
  /** Diseño nuevo o relevamiento de una instalación existente. */
  modo: 'proyecto_nuevo' | 'relevamiento'
  norma: { id: string; edicion: string }
  suministro: { sistema: 'monofasico' | 'trifasico' }
  /** Si falta, la superficie sale de la suma de los ambientes. */
  superficieManual?: { cubiertaM2: number; semicubiertaM2: number }
  opciones: {
    aplicarSimultaneidad: boolean
    /** Factor de potencia para pasar de W a VA cuando la carga no trae el suyo. */
    fpPorDefecto: number
  }
  plantas: Record<Id, Planta>
  ambientes: Record<Id, Ambiente>
  tableros: Record<Id, Tablero>
  circuitos: Record<Id, Circuito>
  elementos: Record<Id, Elemento>
  /** Plantillas ya insertadas en el proyecto. */
  grupos: Record<Id, GrupoPlantilla>
  plantillasPropias: Record<string, PlantillaCircuito>
  catalogoPropio: Record<Id, ArtefactoCatalogo>
}

export interface Planta {
  id: Id
  nombre: string
  orden: number
}

export type Cerramiento = 'cubierto' | 'semicubierto' | 'descubierto'

export interface Ambiente {
  id: Id
  plantaId: Id
  nombre: string
  orden: number
  /** Clave de uso de ambiente de la norma: 'dormitorio', 'cocina'… */
  uso: string
  superficieM2: number
  cerramiento: Cerramiento
  /** Pasillos, balcones y escaleras: los puntos mínimos van por metro lineal. */
  largoM?: number
  /** Reservado para el plano 2D. */
  geometria?: { puntos: [number, number][] }
}

export interface Diferencial {
  id: Id
  inA: number
  sensibilidadMa: number
  polos: 2 | 4
}

export interface Tablero {
  id: Id
  nombre: string
  tipo: 'principal' | 'seccional'
  orden: number
  /** Árbol tablero principal → seccionales. */
  alimentadoDesdeTableroId?: Id
  ambienteId?: Id
  cabecera?: { tipo: 'PIA' | 'seccionador' | 'diferencial'; inA: number; polos: 2 | 4 }
  diferenciales: Diferencial[]
}

export type Curva = 'B' | 'C' | 'D'

export interface Circuito {
  id: Id
  tableroId: Id
  orden: number
  nombre: string
  /** Clave de tipo de circuito de la norma: 'IUG', 'TUG', 'TUE', 'ESPECIFICO'. */
  tipo: string
  proteccion: { inA: number; polos: 2 | 4; curva?: Curva; diferencialId?: Id }
  conductor: {
    seccionMm2: number
    seccionPEMm2?: number
    /** Clave de método de instalación de la norma: 'embutida_B1'. */
    metodo: string
    /** Circuitos que comparten la cañería, contando este. */
    circuitosEnLaCaneria: number
    longitudM?: number
  }
  fase?: 'L1' | 'L2' | 'L3'
  /** Circuitos de uso específico: la demanda la define el proyectista. */
  demandaManualVA?: number
  notas?: string
}

export interface Potencia {
  valor: number
  unidad: 'W' | 'VA'
  /** Factor de potencia, para pasar de W a VA. */
  fp?: number
}

interface ElementoBase {
  id: Id
  orden: number
  nombre?: string
  ambienteId: Id | null
  /** Si vino de una plantilla: a qué grupo pertenece y qué rol cumple. */
  grupoId?: Id
  rol?: string
  /** Reservado para el plano 2D. */
  posicion?: { plantaId: Id; x: number; y: number }
}

export type UsoBoca = 'iluminacion' | 'tomacorriente' | 'mixta' | 'conexion_fija'
export type Caja = 'rectangular' | 'cuadrada' | 'octogonal' | 'en_tablero'

/** Lo que la norma cuenta como boca: el punto donde se conecta un aparato. */
export interface Boca extends ElementoBase {
  clase: 'boca'
  circuitoId: Id
  uso: UsoBoca
  tomas?: { cantidad: number; corrienteA: number }
  caja?: Caja
  alturaM?: number
}

export type TipoMando =
  | 'interruptor'
  | 'conmutador'
  | 'cruzamiento'
  | 'pulsador'
  | 'atenuador'
  | 'sensor_movimiento'
  | 'fotocelula'
  | 'temporizador'
  | 'automatico_escalera'

/** Maniobra y automatismos. Su caja no cuenta como boca. */
export interface Mando extends ElementoBase {
  clase: 'mando'
  circuitoId: Id
  tipo: TipoMando
  /** Bocas que maneja. */
  comanda: Id[]
  capacidadMax?: Potencia
  consumoPropio?: Potencia
}

export type TipoCarga = 'luminaria' | 'artefacto' | 'ventilador' | 'motor' | 'fuente_mbt'

/** Un consumo. Su circuito se deduce subiendo por `conectadaA`. */
export interface Carga extends ElementoBase {
  clase: 'carga'
  tipo: TipoCarga
  /** Boca o contenedor al que está enchufada o conectada. */
  conectadaA: Id
  /** De qué ítem del catálogo salió; la potencia queda copiada y es editable. */
  catalogoId?: Id
  potencia: Potencia
  cantidad: number
  /** Entre 0 y 1: qué parte de la potencia se considera en la demanda. */
  factorUso?: number
  horasDia?: number
}

export type TipoContenedor = 'regleta' | 'alargue' | 'adaptador'
export type Capacidad = Potencia | { corrienteA: number }

/** Regleta, zapatilla, alargue o triple: tiene límite propio y contiene cargas. */
export interface Contenedor extends ElementoBase {
  clase: 'contenedor'
  tipo: TipoContenedor
  /** Boca u otro contenedor. */
  conectadaA: Id
  capacidadMax: Capacidad
}

export type Elemento = Boca | Mando | Carga | Contenedor

export interface GrupoPlantilla {
  id: Id
  plantillaId: string
  plantillaVersion: number
  nombre: string
  parametros: Record<string, number | string>
  /** Ranura de la plantilla → circuito del proyecto. */
  circuitos: Record<string, Id>
  /** Rol de la plantilla → elementos creados o enlazados. */
  roles: Record<string, Id[]>
}
