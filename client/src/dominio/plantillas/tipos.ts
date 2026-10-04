import type { Caja, TipoMando, UsoBoca } from '../modelo/tipos'

/**
 * Una plantilla de circuito es un JSON sin funciones, para que el usuario
 * pueda guardar las suyas: ranuras (circuitos que toca), parámetros, roles
 * (elementos que crea) y redes (conductores que unen bornes).
 */

export interface RanuraCircuito {
  id: string
  etiqueta?: string
  /** Claves de tipo de circuito de la norma. */
  tiposAdmitidos: string[]
}

export interface ParametroPlantilla {
  id: string
  etiqueta: string
  min: number
  max: number
  porDefecto: number
}

export type ElementoDePlantilla =
  | { clase: 'boca'; uso: UsoBoca; tomas?: { cantidad: number; corrienteA: number }; caja?: Caja }
  | { clase: 'mando'; tipo: TipoMando }

export interface RolPlantilla {
  id: string
  etiqueta: string
  ranura: string
  cantidad: number | { parametro: string }
  elemento: ElementoDePlantilla
  bornes: string[]
  /**
   * Cuando el rol tiene varias instancias conectadas una detrás de otra (los
   * cruzamientos de una combinación): qué bornes de una se unen con cuáles de
   * la siguiente. Cada par es un conductor más por cada instancia adicional.
   */
  serie?: { funcion: FuncionRed; pares: [string, string][] }
}

/** Qué hace un conductor. 'mando' es la línea de pulsadores de un automático. */
export type FuncionRed = 'linea' | 'neutro' | 'pe' | 'alimentacion_efecto' | 'retorno' | 'viajero' | 'mando'

export const FUNCIONES_DE_RED: FuncionRed[] = ['linea', 'neutro', 'pe', 'alimentacion_efecto', 'retorno', 'viajero', 'mando']

export interface RedPlantilla {
  id: string
  funcion: FuncionRed
  /** Bornes que une: "rol.borne", o "@ranura.L" para la línea, el neutro o el PE del circuito. */
  une: string[]
}

export interface PlantillaCircuito {
  id: string
  version: number
  origen: 'sistema' | 'usuario'
  nombre: string
  descripcion: string
  ranuras: RanuraCircuito[]
  parametros: ParametroPlantilla[]
  roles: RolPlantilla[]
  redes: RedPlantilla[]
}
