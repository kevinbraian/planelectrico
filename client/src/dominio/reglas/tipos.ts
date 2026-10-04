import type { Calculo } from '../calculo/tipos'
import type { Id, Proyecto } from '../modelo/tipos'
import type { Normativa, Referencia } from '../normas/contrato'

export type Severidad = 'error' | 'aviso' | 'info'

export interface Objetivo {
  tipo: 'proyecto' | 'ambiente' | 'tablero' | 'circuito' | 'elemento'
  id: Id
}

export interface Advertencia {
  /** Estable entre recálculos: regla, objetivo y variante. */
  id: string
  reglaId: string
  severidad: Severidad
  /** En castellano y con palabras propias; nunca texto copiado de la norma. */
  mensaje: string
  objetivo: Objetivo
  referencia: Referencia
  /** Valores que usó la regla. Los tests comparan esto, no el texto. */
  datos: Record<string, number | string>
  sugerencia?: string
}

export interface ContextoRegla {
  proyecto: Proyecto
  norma: Normativa
  calculo: Calculo
}

export interface Regla {
  id: string
  titulo: string
  evaluar(ctx: ContextoRegla): Advertencia[]
}

/** Arma una advertencia con su id estable. `variante` distingue dos avisos de la misma regla sobre el mismo objetivo. */
export function advertir(
  reglaId: string,
  a: Omit<Advertencia, 'id' | 'reglaId' | 'datos'> & { datos?: Advertencia['datos']; variante?: string },
): Advertencia {
  const { variante, datos, ...resto } = a
  const id = [reglaId, a.objetivo.id, variante].filter(Boolean).join(':')
  return { id, reglaId, datos: datos ?? {}, ...resto }
}
