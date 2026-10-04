import type { Id } from '../modelo/tipos'
import type {
  CircuitosMinimos,
  Citado,
  CorrienteAdmisible,
  GradoDef,
  PuntosMinimos,
  Referencia,
  TipoCircuitoDef,
} from '../normas/contrato'

/** Un renglón del "de dónde sale este número". */
export interface Paso {
  texto: string
  ref?: Referencia
}

/** Un valor calculado con los pasos que lo explican. */
export interface Magnitud {
  valor: number
  pasos: Paso[]
}

export interface ResumenCircuito {
  circuitoId: Id
  /** "C1", "C2"… según el orden en el tablero. */
  codigo: string
  /** undefined si la norma no conoce el tipo guardado en el circuito. */
  tipo?: Citado<TipoCircuitoDef>
  /** Circuito de iluminación con al menos una boca con tomacorriente. */
  tieneTomasDerivadas: boolean
  bocas: number
  mandos: number
  /** Todo lo conectado, a potencia plena. */
  potenciaInstaladaVA: number
  /** Lo conectado, afectado por el factor de uso de cada carga. */
  cargaConocidaVA: number
  /** Consumo estimado de las cargas que tienen horas de uso cargadas. */
  energiaMensualKWh: number
  dpmsMinima?: Citado<number>
  dpms: Magnitud
  ib: Magnitud
  inA: number
  cargados: 2 | 3
  iz: CorrienteAdmisible
  seccionMinima?: Citado<number>
}

export interface PmuAmbiente {
  ambienteId: Id
  /** undefined si no hay grado todavía o la norma no conoce el uso. */
  requerido?: Citado<PuntosMinimos>
  /** Bocas que cuentan para el mínimo, por tipo de circuito. */
  actual: Record<string, number>
  /** Módulos de tomacorriente del ambiente, por tipo de circuito. */
  modulos: Record<string, number>
}

export interface ResumenProyecto {
  cubiertaM2: number
  semicubiertaM2: number
  descubiertaM2: number
  superficie: Magnitud
  grado?: Citado<GradoDef>
  circuitosMinimos?: Citado<CircuitosMinimos>
  circuitosPorTipo: Record<string, number>
  /** Coeficiente que le corresponde al grado, se aplique o no. */
  coeficiente?: Citado<number>
  coeficienteAplicado: number
  /** Circuitos de uso general y especial, antes del coeficiente. */
  dpmsGeneralSinCoeficienteVA: number
  dpmsEspecificosVA: number
  /** Consumo mensual estimado de todo el proyecto. */
  energiaMensualKWh: number
  cargaTotal: Magnitud
  corrienteTotal: Magnitud
  tensionV: number
}

export interface CargaDeElemento {
  /** VA a potencia plena de todo lo que cuelga del elemento (o del elemento mismo). */
  va: number
  a: number
}

export interface Calculo {
  proyecto: ResumenProyecto
  circuitos: Record<Id, ResumenCircuito>
  ambientes: Record<Id, PmuAmbiente>
  /** Carga a potencia plena por boca, contenedor, carga y mando. */
  cargas: Record<Id, CargaDeElemento>
}
