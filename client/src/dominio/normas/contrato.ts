/**
 * Contrato entre el motor y una norma. El motor nunca lee el JSON de la norma:
 * le pregunta a una `Normativa`, y cada respuesta viaja con su cita.
 */

export type Referencia =
  | { origen: 'norma'; norma: string; clausula?: string; tabla?: string; pagina?: number }
  | { origen: 'producto'; detalle: string }

/** Un valor normativo con la cita de donde sale. */
export interface Citado<T> {
  valor: T
  ref: Referencia
  /** Cómo se obtuvo, en una frase corta: "2/3 × 9 bocas × 60 VA". */
  detalle?: string
}

export interface GradoDef {
  id: string
  nombre: string
}

export interface VarianteCircuitos {
  id: string
  /** Cantidad exigida por tipo de circuito: { IUG: 2, TUG: 1 }. */
  porTipo: Record<string, number>
  /** Circuitos de libre elección que se suman a los anteriores. */
  libre: number
}

export interface CircuitosMinimos {
  total: number
  variantes: VarianteCircuitos[]
}

export type ClaseCircuito = 'iluminacion' | 'tomacorriente' | 'especifico'

export interface TipoCircuitoDef {
  id: string
  nombre: string
  clase: ClaseCircuito
  /** false cuando la norma remite a otro documento (uso específico). */
  enAlcance: boolean
  /** true si puede llevar tomacorrientes derivados (iluminación con tomas). */
  admiteTomasDerivadas: boolean
  maxBocas?: number
  maxProteccionA?: number
  cargaUnitariaMaxA?: number
  tomaTipo?: string
  nota?: string
}

export interface UsoAmbienteDef {
  id: string
  nombre: string
  nombreCorto: string
  /** true si algún punto mínimo se calcula por metro lineal. */
  pideLargo: boolean
  /** Cerramiento con el que conviene crear el ambiente (un balcón nace semicubierto). */
  cerramientoPorDefecto?: 'cubierto' | 'semicubierto' | 'descubierto'
}

export interface PuntosMinimos {
  /** Bocas mínimas por tipo de circuito: { IUG: 1, TUG: 3 }. */
  porTipo: Record<string, number>
  /** Módulos de tomacorriente adicionales para artefactos de ubicación fija. */
  modulosFijos: number
  /** El tomacorriente exigido puede colgarse del circuito de iluminación. */
  tomaPuedeIrEnIluminacion: boolean
  /** Hay un mínimo por metro lineal y el ambiente no tiene largo cargado. */
  faltaLargo: boolean
  notas: string[]
}

export type CorrienteAdmisible =
  | {
      ok: true
      valor: number
      ref: Referencia
      /** Valor de tabla antes de aplicar el agrupamiento. */
      base: number
      factorAgrupamiento: number
      refAgrupamiento?: Referencia
    }
  | { ok: false; falta: 'metodo' | 'seccion' | 'agrupamiento' }

export interface BloqueVerificacion {
  bloque: string
  verificado: boolean
  ref: Referencia
}

export interface Normativa {
  id: string
  edicion: string
  nombre: string
  alcance: string

  alimentacion(): Citado<{ tensionFaseNeutroV: number; tensionLineaV: number; corrienteMaxOrigenA: number }>
  superficieComputable(s: { cubiertaM2: number; semicubiertaM2: number }): Citado<number>

  grados(): GradoDef[]
  /** undefined si la superficie es cero o negativa. */
  grado(superficieM2: number): Citado<GradoDef> | undefined
  circuitosMinimos(gradoId: string): Citado<CircuitosMinimos> | undefined

  tiposCircuito(): TipoCircuitoDef[]
  tipoCircuito(id: string): Citado<TipoCircuitoDef> | undefined

  usosDeAmbiente(): UsoAmbienteDef[]
  puntosMinimos(q: { uso: string; gradoId: string; superficieM2: number; largoM?: number }): Citado<PuntosMinimos> | undefined

  tomasMaxPorCaja(caja: string): Citado<number> | undefined
  tomasEnTableroPorBoca(): Citado<number>

  /** undefined si la norma no fija un mínimo para ese tipo. */
  dpmsMinimaVA(q: { tipo: string; bocas: number; tieneTomasDerivadas: boolean }): Citado<number> | undefined
  coefSimultaneidad(gradoId: string): Citado<number> | undefined

  seccionMinimaMm2(q: { tipo: string; tieneTomasDerivadas: boolean }): Citado<number> | undefined
  /**
   * Sección mínima de un conductor por su función dentro de un circuito:
   * 'alimentacion_efecto', 'retorno', 'pe'… undefined si la norma no la fija.
   */
  seccionMinimaDeFuncion(funcion: string): Citado<number> | undefined
  metodosInstalacion(): { id: string; nombre: string }[]
  seccionesMm2(metodo: string): number[]
  corrienteAdmisibleA(q: { seccionMm2: number; metodo: string; cargados: 2 | 3; circuitosEnLaCaneria: number }): CorrienteAdmisible

  calibresComerciales(): number[]
  sensibilidadDiferencialMaxMa(): Citado<number>
  refCoordinacion(): Referencia

  /** Bloques de datos y si una persona los verificó contra el documento. */
  verificacion(): BloqueVerificacion[]
}

/** "AEA 90364-7-770 · 770.7.3 · Tabla 770.7.I · p. 14" */
export function citar(ref: Referencia): string {
  if (ref.origen === 'producto') return ref.detalle
  const partes = [ref.norma]
  if (ref.clausula) partes.push(ref.clausula)
  if (ref.tabla) partes.push(`Tabla ${ref.tabla}`)
  if (ref.pagina !== undefined) partes.push(`p. ${ref.pagina}`)
  return partes.join(' · ')
}
